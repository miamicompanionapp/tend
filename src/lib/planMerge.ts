import type { CalendarEvent } from "../types";
import { addDays } from "./date";

/** Replaces every event within [rangeStart, rangeStart + days) with `incoming`, leaving everything else untouched. */
export function replaceRange(existing: CalendarEvent[], incoming: CalendarEvent[], rangeStart: string, days: number): CalendarEvent[] {
  const rangeDates = new Set(Array.from({ length: days }, (_, i) => addDays(rangeStart, i)));
  return [...existing.filter((e) => !rangeDates.has(e.date)), ...incoming];
}
