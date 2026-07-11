import type { CalendarEvent } from "../types";
import { todayISODate } from "../lib/date";
import { eventStyleClass } from "../lib/category";
import { formatTime } from "../lib/schedule";
import { END_HOUR, HOUR_HEIGHT, START_HOUR, layoutDay, offsetForTime } from "../lib/timeGridLayout";
import { useNow } from "../lib/useNow";
import { useLanguage } from "../i18n/LanguageContext";

export const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

/** One day's events, absolutely positioned by time, with a live current-time line if `date` is today. */
export function DayTrack({ date, events }: { date: string; events: CalendarEvent[] }) {
  const { lang } = useLanguage();
  const now = useNow();
  const isToday = date === todayISODate();
  const nowTop = offsetForTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  const laidOut = layoutDay(events.filter((e) => e.date === date));

  return (
    <div className="day-track" style={{ height: GRID_HEIGHT }}>
      {laidOut.map(({ event, top, height, leftPct, widthPct, inset }) => (
        <div
          key={event.id}
          className={`day-track-event ${eventStyleClass(event)}${inset ? " inset" : ""}`}
          style={{ top, height, left: `${leftPct}%`, width: `calc(${widthPct}% - 4px)` }}
        >
          <p className="day-track-event-title">{event.title}</p>
          {height >= 34 && <p className="day-track-event-time">{formatTime(event.startTime, lang)}</p>}
        </div>
      ))}
      {isToday && nowTop >= 0 && nowTop <= GRID_HEIGHT && <div className="day-track-now" style={{ top: nowTop }}><span className="day-track-now-dot" /></div>}
    </div>
  );
}
