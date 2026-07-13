import { useEffect, useState } from "react";
import type { CalendarEvent } from "../types";
import { addDays, todayISODate, weekdayLabel, weekdayNarrow } from "../lib/date";
import { HOUR_HEIGHT, getHourRange } from "../lib/timeGridLayout";
import { HourRuler } from "./HourRuler";
import { DayTrack } from "./DayTrack";
import { useLanguage } from "../i18n/LanguageContext";

const PLAN_HORIZON_WEEKS = 4;

function dayNumber(dateStr: string): string {
  return String(Number(dateStr.split("-")[2]));
}

interface WeekScreenProps {
  events: CalendarEvent[];
  weekStart: string;
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGeneratePlan: () => void;
  onGenerateWeek: (weekStart: string) => void;
  weekGenLoading: string | null;
}

export function WeekScreen({ events, weekStart, weekOffset, onPrevWeek, onNextWeek, onGeneratePlan, onGenerateWeek, weekGenLoading }: WeekScreenProps) {
  const { t, lang } = useLanguage();
  const today = todayISODate();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [selected, setSelected] = useState(() => (days.includes(today) ? today : days[0]));

  useEffect(() => {
    setSelected(days.includes(today) ? today : days[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const weekEvents = events.filter((e) => days.includes(e.date));
  const { start: startHour, end: endHour } = getHourRange(weekEvents);
  const hasAnyEventsEver = events.length > 0;
  const isEmpty = weekEvents.length === 0;
  const withinHorizon = weekOffset >= 0 && weekOffset < PLAN_HORIZON_WEEKS;
  const isGeneratingThisWeek = weekGenLoading === weekStart;

  const gridBackground = {
    backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
    backgroundPosition: "0 1px",
  };

  function EmptyState() {
    if (!hasAnyEventsEver) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 40, padding: "0 20px" }}>
          <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0, maxWidth: "28ch" }}>{t.week.noPlan}</p>
          <button className="btn primary" style={{ flex: "none", padding: "10px 20px" }} onClick={onGeneratePlan}>
            {t.week.generatePlan}
          </button>
        </div>
      );
    }
    if (withinHorizon) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 40, padding: "0 20px" }}>
          <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0, maxWidth: "28ch" }}>{t.week.notPlannedYet}</p>
          <button className="btn primary" style={{ flex: "none", padding: "10px 20px" }} onClick={() => onGenerateWeek(weekStart)} disabled={isGeneratingThisWeek}>
            {isGeneratingThisWeek ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : t.week.generateThisWeek}
          </button>
        </div>
      );
    }
    return (
      <div style={{ marginTop: 40, padding: "0 20px" }}>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0 }}>{weekOffset < 0 ? t.week.pastEmpty : t.week.tooFarAhead}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Phone / portrait: day strip + single day grid */}
      <div className="week-portrait">
        <div className="day-strip-row">
          <button className="week-nav-btn" onClick={onPrevWeek} aria-label={t.week.prevWeek}>
            ‹
          </button>
          <div className="day-strip">
            {days.map((date) => (
              <button
                key={date}
                className={`day-strip-btn${date === selected ? " active" : ""}${date === today ? " today" : ""}`}
                onClick={() => setSelected(date)}
              >
                <span className="day-strip-label">{weekdayNarrow(date, lang)}</span>
                <span className="day-strip-num">{dayNumber(date)}</span>
              </button>
            ))}
          </div>
          <button className="week-nav-btn" onClick={onNextWeek} aria-label={t.week.nextWeek}>
            ›
          </button>
        </div>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="day-grid" style={gridBackground}>
            <HourRuler startHour={startHour} endHour={endHour} />
            <DayTrack date={selected} events={events} startHour={startHour} endHour={endHour} />
          </div>
        )}
      </div>

      {/* Landscape / tablet+: full 7-column grid */}
      <div className="week-grid-wide">
        <div className="week-grid-header-row">
          <button className="week-nav-btn" onClick={onPrevWeek} aria-label={t.week.prevWeek}>
            ‹
          </button>
          <div className="week-grid-header">
            {days.map((date) => (
              <span className={`week-col-label${date === today ? " today" : ""}`} key={date}>
                {weekdayLabel(date, lang)}
              </span>
            ))}
          </div>
          <button className="week-nav-btn" onClick={onNextWeek} aria-label={t.week.nextWeek}>
            ›
          </button>
        </div>
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="week-grid-body" style={gridBackground}>
            <HourRuler startHour={startHour} endHour={endHour} />
            {days.map((date) => (
              <div className="week-col" key={date}>
                <DayTrack date={date} events={events} startHour={startHour} endHour={endHour} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
