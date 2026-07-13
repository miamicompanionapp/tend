import type Anthropic from "@anthropic-ai/sdk";
import type { Lang } from "../../../src/types";

export const DIFF_SCHEMA: Anthropic.Tool.InputSchema = {
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
              category: {
                type: "string",
                enum: ["work", "health", "home", "family", "social", "finance", "learning", "rest", "human"],
              },
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

const LANGUAGE_INSTRUCTION: Record<Lang, string> = {
  en: "Write the summary, every reason, and any event titles you invent in English.",
  tr: "Write the summary, every reason, and any event titles you invent in Turkish (Türkçe) — natural, fluent Turkish, not machine-translated phrasing.",
};

/** Shared by replan.ts (user-described disruptions) and generate-plan.ts's conflict-resolution fallback (a synthetic "disruption" made of overlapping events). */
export function buildReplanSystemPrompt(lang: Lang, now: string | undefined, notes: string | undefined): string {
  const nowLine = (() => {
    if (!now) return "";
    const parsed = new Date(now);
    if (Number.isNaN(parsed.getTime())) return "";
    const weekday = parsed.toLocaleDateString("en-US", { weekday: "long" });
    const time = parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `\nCurrent date and time: ${now} (${weekday}, ${time}). This is ground truth from the device's clock — treat it as authoritative over anything the user's message implies about what time it is. Never schedule or move any event to start before this moment today; if the only way to fit something requires a slot that has already passed, move the lower-priority item to a different day instead of into the past.\n`;
  })();

  return `You are Tend's scheduling assistant. The user will describe a disruption to their day (an emergency, a cancellation, running late, etc). You have their goals (with priority and kind) and their current calendar events for today.
${nowLine}
Decide the changes needed to fully accommodate the disruption:
- Resolve every scheduling conflict your changes create or that already exists because of the disruption — do not leave two events overlapping and mention it as something the user should "adjust separately." If fixing one conflict creates another, keep adjusting (a different time, a different day, or cancelling if truly necessary) until nothing on today's plan overlaps.
- Prefer moving or shrinking low/medium priority, non-locked events over cancelling high-priority ones.
- Never silently move or cancel an event with locked: true — only note it if directly relevant, and prefer working around it.
- If nothing on the calendar conflicts with the disruption, return an empty diff and say so in the summary.
- Each diff entry needs a clear one-sentence reason a person would find satisfying, referencing priority or the disruption itself.
- eventId must match an id from the provided events list (or the goal id, for a cancelled recurring instance that isn't yet a concrete event).
- For "moved" entries, include an 'event' object with the full resulting event: same id as eventId, same title/category/durationMinutes unless those genuinely changed, and the new date/startTime. For "added" entries, include an 'event' object with a new unique id. Omit 'event' for "cancelled" and "kept".
- When an 'event' object needs a category, pick whichever of these best fits: "work" (job/career), "health" (exercise, medical, self-care), "home" (chores, errands, home maintenance), "family" (time with kids/partner/parents/relatives), "social" (friends, community, events), "finance" (bills, budgeting, financial admin), "learning" (courses, reading, hobbies, personal growth), "rest" (leisure, relaxation, unstructured downtime), or "human" (baseline needs like meals or short breaks).
- ${LANGUAGE_INSTRUCTION[lang]} Do not translate the user's own existing event/goal titles — keep those exactly as given.
- Before you finalize your answer, work through the arithmetic explicitly for every event you move or add: does the exact date+startTime you chose fall before the current date+time given above? If a first attempt at a slot lands in the past (e.g. "move it 90 minutes earlier" would start before now), that attempt is invalid — do not use it. Find an actual valid slot (later the same day, or a different day) instead, and only then write your final answer.
${notes ? `- The user gave these standing preferences/constraints when setting up their goals — they apply here too, not just at initial plan creation. Honor them whenever they don't conflict with a fixed/locked goal: "${notes}"\n` : ""}- Output only via the tool call — no prose outside it.`;
}
