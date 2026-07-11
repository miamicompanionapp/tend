import type { CalendarEvent, PlanDiffEntry } from "../types";

/** Applies an approved replan diff to the current events list. */
export function applyDiff(events: CalendarEvent[], diff: PlanDiffEntry[]): CalendarEvent[] {
  let next = events;
  for (const entry of diff) {
    if (entry.action === "cancelled") {
      next = next.filter((e) => e.id !== entry.eventId);
    } else if ((entry.action === "moved" || entry.action === "added") && entry.event) {
      const idx = next.findIndex((e) => e.id === entry.eventId);
      next = idx === -1 ? [...next, entry.event] : next.map((e, i) => (i === idx ? entry.event! : e));
    }
    // "kept" is a no-op — the event already stays as-is.
  }
  return next;
}
