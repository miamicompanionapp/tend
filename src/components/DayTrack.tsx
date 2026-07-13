import type { CalendarEvent } from "../types";
import { todayISODate } from "../lib/date";
import { eventStyleClass } from "../lib/category";
import { formatTime } from "../lib/schedule";
import { HOUR_HEIGHT, layoutDay, offsetForTime } from "../lib/timeGridLayout";
import { useNow } from "../lib/useNow";
import { useLanguage } from "../i18n/LanguageContext";

/** One day's events, absolutely positioned by time, with a live current-time line if `date` is today. */
export function DayTrack({
  date,
  events,
  startHour,
  endHour,
  onSelectEvent,
}: {
  date: string;
  events: CalendarEvent[];
  startHour: number;
  endHour: number;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const { lang } = useLanguage();
  const now = useNow();
  const isToday = date === todayISODate();
  const gridHeight = (endHour - startHour) * HOUR_HEIGHT;
  const nowTop = offsetForTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, startHour);
  const laidOut = layoutDay(
    events.filter((e) => e.date === date),
    startHour,
  );

  return (
    <div className="day-track" style={{ height: gridHeight }}>
      {laidOut.map(({ event, top, height, leftPct, widthPct, inset }) => (
        <div
          key={event.id}
          className={`day-track-event ${eventStyleClass(event)}${inset ? " inset" : ""}`}
          style={{ top, height, left: `${leftPct}%`, width: `calc(${widthPct}% - 4px)` }}
          onClick={() => onSelectEvent(event)}
        >
          <p className="day-track-event-title">{event.title}</p>
          {height >= 34 && <p className="day-track-event-time">{formatTime(event.startTime, lang)}</p>}
        </div>
      ))}
      {isToday && nowTop >= 0 && nowTop <= gridHeight && <div className="day-track-now" style={{ top: nowTop }}><span className="day-track-now-dot" /></div>}
    </div>
  );
}
