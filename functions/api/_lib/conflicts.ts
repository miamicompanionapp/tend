import type { CalendarEvent } from "../../../src/types";

export interface Conflict {
  date: string;
  a: CalendarEvent;
  b: CalendarEvent;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function addMinutes(time: string, minutes: number): string {
  const total = ((minutesOf(time) + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Finds every pair of events on the same date whose time ranges overlap. */
export function findOverlaps(events: CalendarEvent[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }
  for (const [date, dayEvents] of byDate) {
    const sorted = [...dayEvents].sort((x, y) => minutesOf(x.startTime) - minutesOf(y.startTime));
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const aEnd = minutesOf(a.startTime) + a.durationMinutes;
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        if (minutesOf(b.startTime) >= aEnd) break; // sorted ascending — nothing later can overlap `a` either
        conflicts.push({ date, a, b });
      }
    }
  }
  return conflicts;
}

export function describeConflicts(conflicts: Conflict[]): string {
  return conflicts
    .map((c) => `- ${c.date}: "${c.a.title}" (${c.a.startTime}-${addMinutes(c.a.startTime, c.a.durationMinutes)}) overlaps "${c.b.title}" (${c.b.startTime}-${addMinutes(c.b.startTime, c.b.durationMinutes)})`)
    .join("\n");
}
