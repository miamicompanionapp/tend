import type { CalendarEvent } from "../types";
import { todayISODate } from "../lib/date";
import { HOUR_HEIGHT } from "../lib/timeGridLayout";
import { HourRuler } from "./HourRuler";
import { DayTrack } from "./DayTrack";

export function TodayScreen({ events, loading }: { events: CalendarEvent[]; loading: boolean }) {
  const today = todayISODate();
  const hasEvents = events.some((e) => e.date === today);

  if (!hasEvents) {
    return (
      <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginTop: 60 }}>
        {loading ? "Planning your day…" : "Nothing planned for today yet. Add a goal to get started."}
      </p>
    );
  }

  return (
    <div
      className="day-grid"
      style={{
        backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
        backgroundPosition: "0 1px",
      }}
    >
      <HourRuler />
      <DayTrack date={today} events={events} />
    </div>
  );
}
