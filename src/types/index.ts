export type GoalKind = "fixed" | "recurring" | "flexible";

export type Priority = "high" | "medium" | "low";

export type Category = "work" | "health" | "home" | "social" | "human";

export interface Goal {
  id: string;
  title: string;
  kind: GoalKind;
  category: Category;
  priority: Priority;
  /** Human-readable cadence, e.g. "3x per week", "Mon-Fri", "1x per month" */
  cadence: string;
  /** Preferred time-of-day window, e.g. "evening", "daylight", "any" */
  timePreference?: string;
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
