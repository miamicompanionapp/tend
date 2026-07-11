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
  /** True when this is a short event rendered as a layered card inside a longer "host" event. */
  inset?: boolean;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Vertical offset in px for a given clock time within the grid's hour range. */
export function offsetForTime(time: string): number {
  return ((minutesOf(time) - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

interface TimedItem {
  event: CalendarEvent;
  start: number;
  end: number;
}

function toTimedItems(events: CalendarEvent[]): TimedItem[] {
  return events
    .map((event) => {
      const start = minutesOf(event.startTime);
      return { event, start, end: start + Math.max(event.durationMinutes, 15) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function clusterByOverlap(items: TimedItem[]): TimedItem[][] {
  const clusters: TimedItem[][] = [];
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
  return clusters;
}

/** Greedy day-view column assignment: reuse the first column whose last event has already ended. */
function assignColumns(items: TimedItem[]): { item: TimedItem; col: number; colCount: number }[] {
  const columnEnds: number[] = [];
  const withCol = items.map((item) => {
    let col = columnEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[col] = item.end;
    }
    return { item, col };
  });
  const colCount = columnEnds.length;
  return withCol.map((w) => ({ ...w, colCount }));
}

function pxFor(item: TimedItem): { top: number; height: number } {
  return {
    top: ((item.start - START_HOUR * 60) / 60) * HOUR_HEIGHT,
    height: Math.max(((item.end - item.start) / 60) * HOUR_HEIGHT - 2, 20),
  };
}

const INSET_MAX_MINUTES = 60;
const HOST_MIN_MINUTES = 120;
const INSET_WIDTH_FACTOR = 0.62;

/**
 * Lays out one day's events into a time-grid track: each gets a pixel
 * top/height from its startTime/durationMinutes.
 *
 * Short events (e.g. a 30-minute lunch) that fall entirely inside a much
 * longer event (e.g. an 8-hour workday) are inset — rendered as a smaller
 * card layered over the right edge of the host's block — instead of
 * splitting both into half-width columns, which would waste half the
 * host's width on a sliver. Everything else uses the classic day-view
 * side-by-side column split (greedy, not globally optimal, but good
 * enough for a handful of daily events).
 */
export function layoutDay(events: CalendarEvent[]): LaidOutEvent[] {
  const clusters = clusterByOverlap(toTimedItems(events));
  const out: LaidOutEvent[] = [];

  for (const cluster of clusters) {
    // For each short event, find the longest event in the cluster that
    // fully spans it in time — its "host", if any.
    const hostOf = new Map<TimedItem, TimedItem>();
    for (const item of cluster) {
      if (item.end - item.start > INSET_MAX_MINUTES) continue;
      let host: TimedItem | null = null;
      for (const candidate of cluster) {
        if (candidate === item) continue;
        if (candidate.end - candidate.start < HOST_MIN_MINUTES) continue;
        if (candidate.start > item.start || candidate.end < item.end) continue;
        if (!host || candidate.end - candidate.start > host.end - host.start) host = candidate;
      }
      if (host) hostOf.set(item, host);
    }

    const baseItems = cluster.filter((item) => !hostOf.has(item));
    const baseLayout = assignColumns(baseItems);
    const baseByItem = new Map(baseLayout.map((b) => [b.item, b]));

    for (const b of baseLayout) {
      out.push({ event: b.item.event, ...pxFor(b.item), leftPct: (b.col / b.colCount) * 100, widthPct: 100 / b.colCount });
    }

    const insetsByHost = new Map<TimedItem, TimedItem[]>();
    for (const [item, host] of hostOf) {
      const list = insetsByHost.get(host) ?? [];
      list.push(item);
      insetsByHost.set(host, list);
    }
    for (const [host, insets] of insetsByHost) {
      const hostLayout = baseByItem.get(host);
      if (!hostLayout) continue;
      const hostLeftPct = (hostLayout.col / hostLayout.colCount) * 100;
      const hostWidthPct = 100 / hostLayout.colCount;
      const bandLeftPct = hostLeftPct + hostWidthPct * (1 - INSET_WIDTH_FACTOR);
      const bandWidthPct = hostWidthPct * INSET_WIDTH_FACTOR;

      for (const w of assignColumns(insets)) {
        out.push({
          event: w.item.event,
          ...pxFor(w.item),
          leftPct: bandLeftPct + (w.col / w.colCount) * bandWidthPct,
          widthPct: bandWidthPct / w.colCount,
          inset: true,
        });
      }
    }
  }
  return out;
}
