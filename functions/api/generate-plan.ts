import type Anthropic from "@anthropic-ai/sdk";
import { getClient, jsonResponse, type Env } from "./_lib/claude";
import { logAiRequest } from "./_lib/db";
import { findOverlaps, describeConflicts } from "./_lib/conflicts";
import { DIFF_SCHEMA, buildReplanSystemPrompt } from "./_lib/replanCore";
import { applyDiff } from "../../src/lib/diff";
import type { CalendarEvent, GeneratePlanRequest, Goal, Lang, PlanDiffEntry } from "../../src/types";

const MAX_CONFLICT_RETRIES = 2;

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
          category: {
            type: "string",
            enum: ["work", "health", "home", "family", "social", "finance", "learning", "rest", "human"],
          },
          date: { type: "string", description: "ISO date, e.g. 2026-07-13" },
          startTime: { type: "string", description: "24-hour HH:mm" },
          durationMinutes: { type: "integer" },
          autoAdded: { type: "boolean", description: "true for events Tend adds on its own, not requested by the user" },
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

const LANGUAGE_INSTRUCTION: Record<Lang, string> = {
  en: "Write all event titles and any other generated text in English.",
  tr: "Write all event titles and any other generated text in Turkish (Türkçe) — natural, fluent Turkish, not machine-translated phrasing.",
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

function buildSystemPrompt(dates: string[], notes: string | undefined, lang: Lang, existingEvents: CalendarEvent[] | undefined): string {
  const dayLines = dates
    .map((date) => {
      const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
      return `${date} (${weekday})`;
    })
    .join("\n");

  const existingLines =
    existingEvents && existingEvents.length > 0
      ? `\nThese events are already scheduled elsewhere in the plan, outside this date range — do not create another occurrence for a goal that already appears here unless its repeat pattern genuinely calls for more than one within this range (e.g. "weekly" or "daily"):\n${existingEvents
          .map((e) => `- goalId ${e.goalId ?? "(none)"}: "${e.title}" on ${e.date}`)
          .join("\n")}\n`
      : "";

  return `You are Tend's scheduling assistant. Given a list of goals, generate a concrete calendar of events covering exactly these dates:
${dayLines}

Rules:
- Expand each goal's repeat pattern into real events on the correct dates within this range. "weekdays" = Mon-Fri only. "weekly" with daysOfWeek picks those specific weekdays every week in range. "weekly" with timesPerWeek and no daysOfWeek means you choose which days, spread reasonably across the week. "daily" = every date in range. "monthly" = once, on a reasonable date. "once" = a single occurrence, placed on the earliest sensible date.
- If a goal has startTime, use it exactly for every occurrence. Otherwise pick a time that fits its timePreference (morning ~7-11, afternoon ~12-17, evening ~17-21, any = your choice) and don't overlap other events that day.
- Goals with kind "fixed" produce events with locked: true. Other goals produce locked: false or omitted.
- Set goalId to the originating goal's id on every event produced from a goal.
- Categorize every event using whichever of these best fits its title and purpose: "work" (job/career), "health" (exercise, medical, self-care), "home" (chores, errands, home maintenance), "family" (time with kids/partner/parents/relatives), "social" (friends, community, events), "finance" (bills, budgeting, financial admin), "learning" (courses, reading, hobbies, personal growth), "rest" (leisure, relaxation, unstructured downtime), or "human" (baseline needs like meals or short breaks, if the user or their notes call for them).
- Never produce two events for the same date whose time ranges overlap. Double-check every date's events against each other before finalizing — this is a hard requirement, not a preference.
- Give every event a unique id, e.g. "ev-<goalId or slug>-<date>".
- ${LANGUAGE_INSTRUCTION[lang]} Do not translate the user's own goal titles — keep those exactly as given.
${existingLines}${notes ? `- The user gave these special instructions/preferences — follow them whenever they don't conflict with a fixed/locked goal: "${notes}"\n` : ""}- Output only via the tool call — no prose.`;
}

/**
 * Last-resort fallback when the retry loop in onRequestPost still leaves overlaps:
 * reuses replan's own conflict-resolution prompt/schema (the same one used for
 * user-described disruptions), treating the remaining overlaps as a synthetic
 * disruption to resolve by moving/cancelling the lower-priority, non-locked event.
 */
async function resolveRemainingConflicts(
  client: Anthropic,
  events: CalendarEvent[],
  goals: Goal[],
  lang: Lang,
): Promise<CalendarEvent[]> {
  const conflicts = findOverlaps(events);
  if (conflicts.length === 0) return events;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: buildReplanSystemPrompt(lang, undefined, undefined),
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `Disruption: the generated calendar below still has scheduling conflicts after two automatic fix attempts. Resolve them now.\n\nGoals:\n${JSON.stringify(goals, null, 2)}\n\nThis batch's events:\n${JSON.stringify(events, null, 2)}\n\nConflicts to resolve:\n${describeConflicts(conflicts)}\n\nWork through the scheduling arithmetic, then call return_replan with your final answer.`,
      },
    ],
    tools: [{ name: "return_replan", description: "Return the proposed plan changes", input_schema: DIFF_SCHEMA }],
    tool_choice: { type: "auto" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return events;

  const result = toolUse.input as { summary: string; diff: PlanDiffEntry[] };
  return applyDiff(events, result.diff);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const startedAt = Date.now();
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
  const language: Lang = body.language === "tr" ? "tr" : "en";

  let client;
  try {
    client = getClient(env);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  const tool: Anthropic.Tool = { name: "return_plan", description: "Return the generated calendar events", input_schema: EVENT_SCHEMA };
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `Goals:\n${JSON.stringify(body.goals, null, 2)}` }];

  try {
    let events: CalendarEvent[] = [];
    let retriesUsed = 0;

    // Claude is told never to overlap two events, but it's not a real constraint
    // solver — it can still slip on a big batch. Rather than trust the first
    // answer, deterministically check it and give Claude up to two chances to
    // fix just the specific conflicts found, before falling back to replan's
    // dedicated conflict-resolution prompt as a last resort.
    for (let attempt = 0; ; attempt++) {
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        system: buildSystemPrompt(dates, body.notes, language, body.existingEvents),
        messages,
        tools: [tool],
        tool_choice: { type: "tool", name: "return_plan" },
      });

      const toolUse = response.content.find((block) => block.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        context.waitUntil(
          logAiRequest(env, { endpoint: "generate-plan", model, quality: body.quality, requestBody: body, success: false, error: "Claude did not return a plan", durationMs: Date.now() - startedAt }),
        );
        return jsonResponse({ error: "Claude did not return a plan" }, 502);
      }

      events = (toolUse.input as { events: CalendarEvent[] }).events;
      const conflicts = findOverlaps(events);
      if (conflicts.length === 0 || attempt >= MAX_CONFLICT_RETRIES) break;

      retriesUsed++;
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `These events overlap:\n${describeConflicts(conflicts)}\n\nFix only these — keep every other event exactly as is. Move or shrink the lower-priority, non-locked event to a free slot the same day (or a different day if there's truly no room); never move a locked event. Call return_plan again with the FULL corrected list of all ${events.length} events, not just the ones you changed.`,
          },
        ],
      });
    }

    const remaining = findOverlaps(events);
    if (remaining.length > 0) {
      events = await resolveRemainingConflicts(client, events, body.goals, language);
    }

    context.waitUntil(
      logAiRequest(env, {
        endpoint: "generate-plan",
        model,
        quality: body.quality,
        requestBody: body,
        responseBody: { events, conflictRetries: retriesUsed, resolvedViaReplan: remaining.length > 0 },
        success: true,
        durationMs: Date.now() - startedAt,
      }),
    );
    return jsonResponse({ events });
  } catch (err) {
    const message = (err as Error).message;
    context.waitUntil(
      logAiRequest(env, { endpoint: "generate-plan", model, quality: body.quality, requestBody: body, success: false, error: message, durationMs: Date.now() - startedAt }),
    );
    return jsonResponse({ error: message }, 502);
  }
};
