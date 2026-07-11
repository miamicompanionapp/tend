import type { Goal, Repeat } from "../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function describeRepeat(repeat: Repeat): string {
  switch (repeat.freq) {
    case "once":
      return "One time";
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "monthly":
      return "Monthly";
    case "weekly":
      if (repeat.daysOfWeek && repeat.daysOfWeek.length > 0) {
        return repeat.daysOfWeek
          .slice()
          .sort((a, b) => a - b)
          .map((d) => DAY_LABELS[d])
          .join(", ");
      }
      if (repeat.timesPerWeek) return `${repeat.timesPerWeek}x per week`;
      return "Weekly";
  }
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

const TIME_PREFERENCE_LABEL: Record<NonNullable<Goal["timePreference"]>, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  any: "Any time",
};

/** Human-readable summary shown on the goal card, e.g. "Weekdays · 9:00am–5:00pm". */
export function describeGoalSchedule(goal: Goal): string {
  const parts = [describeRepeat(goal.repeat)];

  if (goal.startTime) {
    const start = formatTime(goal.startTime);
    if (goal.durationMinutes) {
      const [h, m] = goal.startTime.split(":").map(Number);
      const endMinutes = h * 60 + m + goal.durationMinutes;
      const end = formatTime(`${Math.floor(endMinutes / 60) % 24}:${String(endMinutes % 60).padStart(2, "0")}`);
      parts.push(`${start}–${end}`);
    } else {
      parts.push(start);
    }
  } else if (goal.timePreference) {
    parts.push(TIME_PREFERENCE_LABEL[goal.timePreference]);
    if (goal.durationMinutes) parts.push(`${goal.durationMinutes} min`);
  } else if (goal.durationMinutes) {
    parts.push(`${goal.durationMinutes} min`);
  }

  return parts.join(" · ");
}
