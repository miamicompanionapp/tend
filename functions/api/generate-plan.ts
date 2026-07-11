import type Anthropic from "@anthropic-ai/sdk";
import { getClient, jsonResponse, type Env } from "./_lib/claude";
import type { CalendarEvent, GeneratePlanRequest } from "../../src/types";

const EVENT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          goalId: { type: "string", description: "id of the goal this event fulfills, if any" },
          title: { type: "string" },
          category: { type: "string", enum: ["work", "health", "home", "social", "human"] },
          date: { type: "string", description: "ISO date, e.g. 2026-07-13" },
          startTime: { type: "string", description: "24-hour HH:mm" },
          durationMinutes: { type: "integer" },
          autoAdded: { type: "boolean", description: "true for breakfast/lunch/dinner Tend adds on its own" },
          locked: { type: "boolean", description: "true for fixed commitments that must not move" },
        },
        required: ["id", "title", "category", "date", "startTime", "durationMinutes"],
        additionalProperties: false,
      },
    },
  },
  required: ["events"],
  additionalProperties: false,
};

const MODEL_BY_QUALITY: Record<string, string> = {
  careful: "claude-opus-4-8",
  fast: "claude-sonnet-5",
};

function dateRange(startDate: string, days: number): string[] {
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(start);
    dt.setUTCDate(start.getUTCDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}

function buildSystemPrompt(dates: string[], notes: string | undefined): string {
  const dayLines = dates
    .map((date) => {
      const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
      return `${date} (${weekday})`;
    })
    .join("\n");

  return `You are Tend's scheduling assistant. Given a list of goals, generate a concrete calendar of events covering exactly these dates:
${dayLines}

Rules:
- Expand each goal's repeat pattern into real events on the correct dates within this range. "weekdays" = Mon-Fri only. "weekly" with daysOfWeek picks those specific weekdays every week in range. "weekly" with timesPerWeek and no daysOfWeek means you choose which days, spread reasonably across the week. "daily" = every date in range. "monthly" = once, on a reasonable date. "once" = a single occurrence, placed on the earliest sensible date.
- If a goal has startTime, use it exactly for every occurrence. Otherwise pick a time that fits its timePreference (morning ~7-11, afternoon ~12-17, evening ~17-21, any = your choice) and don't overlap other events that day.
- Goals with kind "fixed" produce events with locked: true. Other goals produce locked: false or omitted.
- Set goalId to the originating goal's id on every event produced from a goal.
- Always add Breakfast (~07:30, 30 min), Lunch (~12:30, 30 min), and Dinner (~19:00, 45 min) each day as separate events with category "human" and autoAdded: true, unless a fixed/locked event already occupies that slot — skip or shift slightly to avoid overlap in that case.
- Never produce two events for the same date whose time ranges overlap.
- Give every event a unique id, e.g. "ev-<goalId or slug>-<date>".
${notes ? `- The user gave these special instructions/preferences — follow them whenever they don't conflict with a fixed/locked goal: "${notes}"\n` : ""}- Output only via the tool call — no prose.`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: GeneratePlanRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.goals || !Array.isArray(body.goals) || !body.startDate) {
    return jsonResponse({ error: "goals[] and startDate are required" }, 400);
  }

  const days = body.days && body.days > 0 ? body.days : 7;
  const dates = dateRange(body.startDate, days);
  const model = (body.quality && MODEL_BY_QUALITY[body.quality]) || MODEL_BY_QUALITY.careful;

  let client;
  try {
    client = getClient(env);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      system: buildSystemPrompt(dates, body.notes),
      messages: [
        {
          role: "user",
          content: `Goals:\n${JSON.stringify(body.goals, null, 2)}`,
        },
      ],
      tools: [
        {
          name: "return_plan",
          description: "Return the generated calendar events",
          input_schema: EVENT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "return_plan" },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return jsonResponse({ error: "Claude did not return a plan" }, 502);
    }

    const events = (toolUse.input as { events: CalendarEvent[] }).events;
    return jsonResponse({ events });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 502);
  }
};
