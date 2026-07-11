export type GoalKind = "fixed" | "recurring" | "flexible";

export type Priority = "high" | "medium" | "low";

export type Category = "work" | "health" | "home" | "social" | "human";

/** How a goal repeats, modeled like a calendar-app repeat picker. */
export type RepeatFreq = "once" | "daily" | "weekdays" | "weekly" | "monthly";

export interface Repeat {
  freq: RepeatFreq;
  /** For freq "weekly": specific days it happens on, 0 = Sunday .. 6 = Saturday. */
  daysOfWeek?: number[];
  /** For freq "weekly" with no specific days: how many times per week, days chosen by the assistant. */
  timesPerWeek?: number;
}

export type TimePreference = "morning" | "afternoon" | "evening" | "any";

export interface Goal {
  id: string;
  title: string;
  kind: GoalKind;
  category: Category;
  priority: Priority;
  repeat: Repeat;
  /** Set when the goal happens at a specific clock time (e.g. Work, a class). */
  startTime?: string; // "HH:mm"
  /** Used instead of startTime when the assistant should pick the time within a window. */
  timePreference?: TimePreference;
  durationMinutes?: number;
}

export interface CalendarEvent {
  id: string;
  goalId?: string;
  title: string;
  category: Category;
  /** ISO date, e.g. 2026-07-09 */
  date: string;
  startTime: string; // "HH:mm"
  durationMinutes: number;
  /** true for breakfast/lunch/dinner-style events Tend adds without being asked */
  autoAdded?: boolean;
  locked?: boolean; // fixed commitments the assistant may not move silently
}

export type DiffAction = "moved" | "cancelled" | "kept" | "added";

export interface PlanDiffEntry {
  action: DiffAction;
  eventId: string;
  title: string;
  before?: string; // human-readable previous slot
  after?: string; // human-readable new slot
  reason: string;
}

export interface ReplanRequest {
  message: string;
  goals: Goal[];
  events: CalendarEvent[];
}

export interface ReplanResponse {
  summary: string;
  diff: PlanDiffEntry[];
}

export interface GeneratePlanRequest {
  goals: Goal[];
  /** ISO date for the first day of the range, e.g. 2026-07-13 */
  startDate: string;
  /** Number of days to generate, default 7 */
  days?: number;
}

export interface GeneratePlanResponse {
  events: CalendarEvent[];
}
