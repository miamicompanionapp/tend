import { useState } from "react";
import type { CalendarEvent } from "../types";
import { todayISODate } from "../lib/date";
import { HOUR_HEIGHT, getHourRange } from "../lib/timeGridLayout";
import { HourRuler } from "./HourRuler";
import { DayTrack } from "./DayTrack";
import { EventPopover } from "./EventPopover";
import { useLanguage } from "../i18n/LanguageContext";

export function TodayScreen({
  events,
  loading,
  onGeneratePlan,
}: {
  events: CalendarEvent[];
  loading: boolean;
  onGeneratePlan: () => void;
}) {
  const { t } = useLanguage();
  const today = todayISODate();
  const todayEvents = events.filter((e) => e.date === today);
  const hasEvents = todayEvents.length > 0;
  const { start: startHour, end: endHour } = getHourRange(todayEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  if (!hasEvents) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 60, padding: "0 20px" }}>
        {loading && <span className="spinner" style={{ width: 18, height: 18, borderWidth: 3 }} />}
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0, maxWidth: "28ch" }}>
          {loading ? t.today.planning : t.today.noPlan}
        </p>
        {!loading && (
          <button className="btn primary" style={{ flex: "none", padding: "10px 20px" }} onClick={onGeneratePlan}>
            {t.today.generatePlan}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className="day-grid"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
          backgroundPosition: "0 1px",
        }}
      >
        <HourRuler startHour={startHour} endHour={endHour} />
        <DayTrack date={today} events={events} startHour={startHour} endHour={endHour} onSelectEvent={setSelectedEvent} />
      </div>
      {selectedEvent && <EventPopover event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
