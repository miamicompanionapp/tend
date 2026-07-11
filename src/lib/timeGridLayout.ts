import type { CalendarEvent } from "../types";

export const START_HOUR = 5;
export const END_HOUR = 23;
export const HOUR_HEIGHT = 52;

export interface LaidOutEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Vertical offset in px for a given clock time within the grid's hour range. */
export function offsetForTime(time: string): number {
  return ((minutesOf(time) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

/**
 * Lays out one day's events into a time-grid track: each gets a pixel
 * top/height from its startTime/durationMinutes, and overlapping events
 * split the track width into side-by-side columns (classic day-view
 * calendar layout — greedy column assignment, not globally optimal but
 * good enough for a handful of daily events).
 */
export function layoutDay(events: CalendarEvent[]): LaidOutEvent[] {
  const items = events
    .map((event) => {
      const start = minutesOf(event.startTime);
      return { event, start, end: start + Math.max(event.durationMinutes, 15) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const clusters: (typeof items)[] = [];
  let clusterEnd = -Infinity;
  for (const item of items) {
    if (clusters.length === 0 || item.start >= clusterEnd) {
      clusters.push([item]);
      clusterEnd = item.end;
    } else {
      clusters[clusters.length - 1].push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    }
  }

  const out: LaidOutEvent[] = [];
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const withCol = cluster.map((item) => {
      let col = columnEnds.findIndex((end) => end <= item.start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.end);
      } else {
        columnEnds[col] = item.end;
      }
      return { ...item, col };
    });
    const colCount = columnEnds.length;
    for (const item of withCol) {
      out.push({
        event: item.event,
        top: ((item.start - START_HOUR * 60) / 60) * HOUR_HEIGHT,
        height: Math.max(((item.end - item.start) / 60) * HOUR_HEIGHT - 2, 20),
        leftPct: (item.col / colCount) * 100,
        widthPct: 100 / colCount,
      });
    }
  }
  return out;
}
