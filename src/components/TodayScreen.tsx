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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 60 }}>
        {loading && <span className="spinner" style={{ width: 18, height: 18, borderWidth: 3 }} />}
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0, maxWidth: "26ch" }}>
          {loading
            ? "Planning your day… this can take up to 30 seconds, especially on Careful mode."
            : "Nothing planned for today yet. Add a goal to get started."}
        </p>
      </div>
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
