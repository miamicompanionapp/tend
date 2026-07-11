import type { Goal, Lang, Repeat } from "../types";
import { translations } from "../i18n/translations";

export function describeRepeat(repeat: Repeat, lang: Lang): string {
  const t = translations[lang];
  switch (repeat.freq) {
    case "once":
      return t.schedule.repeatOnce;
    case "daily":
      return t.schedule.repeatDaily;
    case "weekdays":
      return t.schedule.repeatWeekdays;
    case "monthly":
      return t.schedule.repeatMonthly;
    case "weekly":
      if (repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
        return repeat.daysOfWeek
          .slice()
          .sort((a, b) => a - b)
          .map((d) => t.weekday.title[d])
          .join(", ");
      }
      if (repeat.timesPerWeek) return t.schedule.timesPerWeek(repeat.timesPerWeek);
      return t.schedule.repeatWeekly;
  }
}

export function formatTime(time: string, lang: Lang): string {
  const [h, m] = time.split(":").map(Number);
  if (lang === "tr") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

/** Human-readable summary shown on the goal card, e.g. "Weekdays · 9:00am–5:00pm". */
export function describeGoalSchedule(goal: Goal, lang: Lang): string {
  const t = translations[lang];
  const parts = [describeRepeat(goal.repeat, lang)];

  if (goal.startTime) {
    const start = formatTime(goal.startTime, lang);
    if (goal.durationMinutes) {
      const [h, m] = goal.startTime.split(":").map(Number);
      const endMinutes = h * 60 + m + goal.durationMinutes;
      const end = formatTime(`${Math.floor(endMinutes / 60) % 24}:${String(endMinutes % 60).padStart(2, "0")}`, lang);
      parts.push(`${start}–${end}`);
    } else {
      parts.push(start);
    }
  } else if (goal.timePreference) {
    parts.push(t.timePreference[goal.timePreference]);
    if (goal.durationMinutes) parts.push(t.goals.durationMin(goal.durationMinutes));
  } else if (goal.durationMinutes) {
    parts.push(t.goals.durationMin(goal.durationMinutes));
  }

  return parts.join(" · ");
}
