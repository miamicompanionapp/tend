import type { CalendarEvent } from "../types";

/** CSS class suffix for coloring an event by category (matches index.css). */
export function eventStyleClass(event: CalendarEvent): string {
  if (event.autoAdded || event.category === "human") return "human";
  if (event.category === "health") return "health";
  if (event.category === "home") return "home";
  if (event.category === "social") return "social";
  return "";
}
