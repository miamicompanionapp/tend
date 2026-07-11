import type Anthropic from "@anthropic-ai/sdk";
import { getClient, jsonResponse, type Env } from "./_lib/claude";
import type { PlanDiffEntry, ReplanRequest } from "../../src/types";

const DIFF_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "One or two sentences summarizing the change for the user" },
    diff: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["moved", "cancelled", "kept", "added"] },
          eventId: { type: "string" },
          title: { type: "string" },
          before: { type: "string", description: "human-readable previous slot, if applicable" },
          after: { type: "string", description: "human-readable new slot, if applicable" },
          reason: { type: "string" },
          event: {
            type: "object",
            description:
              "Required when action is 'moved' or 'added': the event's resulting state, so the app can actually apply this change. Omit for 'cancelled' and 'kept'.",
            properties: {
              id: { type: "string", description: "same as eventId for 'moved'; a new unique id for 'added'" },
              goalId: { type: "string" },
              title: { type: "string" },
              category: { type: "string", enum: ["work", "health", "home", "social", "human"] },
              date: { type: "string", description: "ISO date, e.g. 2026-07-13" },
              startTime: { type: "string", description: "24-hour HH:mm" },
              durationMinutes: { type: "integer" },
              autoAdded: { type: "boolean" },
              locked: { type: "boolean" },
            },
            required: ["id", "title", "category", "date", "startTime", "durationMinutes"],
            additionalProperties: false,
          },
        },
        required: ["action", "eventId", "title", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "diff"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are Tend's scheduling assistant. The user will describe a disruption to their day (an emergency, a cancellation, running late, etc). You have their goals (with priority and kind) and their current calendar events for today.

Decide the minimal set of changes needed to accommodate the disruption:
- Prefer moving or shrinking low/medium priority, non-locked events over cancelling high-priority ones.
- Never silently move or cancel an event with locked: true — only note it if directly relevant, and prefer working around it.
- If nothing on the calendar conflicts with the disruption, return an empty diff and say so in the summary.
- Each diff entry needs a clear one-sentence reason a person would find satisfying, referencing priority or the disruption itself.
- eventId must match an id from the provided events list (or the goal id, for a cancelled recurring instance that isn't yet a concrete event).
- For "moved" entries, include an 'event' object with the full resulting event: same id as eventId, same title/category/durationMinutes unless those genuinely changed, and the new date/startTime. For "added" entries, include an 'event' object with a new unique id. Omit 'event' for "cancelled" and "kept".
- Output only via the tool call — no prose outside it.`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: ReplanRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.message || !Array.isArray(body.goals) || !Array.isArray(body.events)) {
    return jsonResponse({ error: "message, goals[], and events[] are required" }, 400);
  }

  let client;
  try {
    client = getClient(env);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Disruption: ${body.message}\n\nGoals:\n${JSON.stringify(body.goals, null, 2)}\n\nToday's events:\n${JSON.stringify(body.events, null, 2)}`,
        },
      ],
      tools: [
        {
          name: "return_replan",
          description: "Return the proposed plan changes",
          input_schema: DIFF_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "return_replan" },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return jsonResponse({ error: "Claude did not return a replan" }, 502);
    }

    const result = toolUse.input as { summary: string; diff: PlanDiffEntry[] };
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 502);
  }
};
