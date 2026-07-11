import { useState } from "react";
import type { CalendarEvent } from "../types";
import { addDays, todayISODate, weekdayLabel } from "../lib/date";
import { HOUR_HEIGHT } from "../lib/timeGridLayout";
import { HourRuler } from "./HourRuler";
import { DayTrack } from "./DayTrack";

function dayNumber(dateStr: string): string {
  return String(Number(dateStr.split("-")[2]));
}

export function WeekScreen({ events, weekStart }: { events: CalendarEvent[]; weekStart: string }) {
  const today = todayISODate();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [selected, setSelected] = useState(() => (days.includes(today) ? today : days[0]));

  const gridBackground = {
    backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
    backgroundPosition: "0 1px",
  };

  return (
    <div>
      {/* Phone / portrait: day strip + single day grid */}
      <div className="week-portrait">
        <div className="day-strip">
          {days.map((date) => (
            <button
              key={date}
              className={`day-strip-btn${date === selected ? " active" : ""}${date === today ? " today" : ""}`}
              onClick={() => setSelected(date)}
            >
              <span className="day-strip-label">{weekdayLabel(date)[0]}</span>
              <span className="day-strip-num">{dayNumber(date)}</span>
            </button>
          ))}
        </div>
        <div className="day-grid" style={gridBackground}>
          <HourRuler />
          <DayTrack date={selected} events={events} />
        </div>
      </div>

      {/* Landscape / tablet+: full 7-column grid */}
      <div className="week-grid-wide">
        <div className="week-grid-header">
          {days.map((date) => (
            <span className={`week-col-label${date === today ? " today" : ""}`} key={date}>
              {weekdayLabel(date)}
            </span>
          ))}
        </div>
        <div className="week-grid-body" style={gridBackground}>
          <HourRuler />
          {days.map((date) => (
            <div className="week-col" key={date}>
              <DayTrack date={date} events={events} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
