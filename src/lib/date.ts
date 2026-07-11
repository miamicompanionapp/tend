import type { Lang } from "../types";
import { translations } from "../i18n/translations";

/** Local (not UTC) ISO date, e.g. "2026-07-13". */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISODate(): string {
  return toISODate(new Date());
}

/** Monday-based start of the week containing `d`. */
export function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return toISODate(date);
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** 3-letter weekday abbreviation, e.g. "MON" / "PZT". */
export function weekdayLabel(dateStr: string, lang: Lang): string {
  return translations[lang].weekday.short[dayOfWeek(dateStr)];
}

/** 2-letter weekday abbreviation for compact UI (day-strip), e.g. "Mo" / "Pt". */
export function weekdayNarrow(dateStr: string, lang: Lang): string {
  return translations[lang].weekday.narrow[dayOfWeek(dateStr)];
}
