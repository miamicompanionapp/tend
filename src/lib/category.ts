import type { CalendarEvent } from "../types";

/** CSS class suffix for coloring an event by category (matches index.css). */
export function eventStyleClass(event: CalendarEvent): string {
  if (event.autoAdded || event.category === "human") return "human";
  if (event.category === "health") return "health";
  if (event.category === "home") return "home";
  if (event.category === "family") return "family";
  if (event.category === "social") return "social";
  if (event.category === "finance") return "finance";
  if (event.category === "learning") return "learning";
  if (event.category === "rest") return "rest";
  return ""; // "work" falls back to the default border color
}
