import type { CalendarEvent } from "../types";
import { addDays, todayISODate, weekdayLabel } from "../lib/date";

function chipClass(event: CalendarEvent): string {
  if (event.autoAdded || event.category === "human") return "human";
  if (event.category === "health") return "health";
  if (event.category === "home") return "home";
  if (event.category === "social") return "social";
  return "";
}

export function WeekScreen({ events, weekStart }: { events: CalendarEvent[]; weekStart: string }) {
  const today = todayISODate();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="week-portrait-hint">
        <p style={{ fontSize: 13, color: "var(--ink-soft)", maxWidth: "22ch", margin: 0 }}>
          The week view needs a bit more room. Rotate your phone to see it.
        </p>
      </div>
      <div className="week-grid">
        {days.map((date) => {
          const dayEvents = events
            .filter((e) => e.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <div className={`week-day${date === today ? " today" : ""}`} key={date}>
              <span className="week-day-label">{weekdayLabel(date)}</span>
              {dayEvents.map((event) => (
                <span className={`week-chip ${chipClass(event)}`} key={event.id}>
                  {event.title}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
