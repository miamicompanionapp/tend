import type { CalendarEvent } from "../types";

function categoryClass(event: CalendarEvent): string {
  if (event.autoAdded) return "human";
  if (event.category === "health") return "health";
  if (event.category === "home") return "home";
  return "";
}

function formatTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

export function TodayScreen({ events }: { events: CalendarEvent[] }) {
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      {sorted.map((event) => (
        <div className="agenda-row" key={event.id}>
          <div className="agenda-time">{formatTime(event.startTime)}</div>
          <div className={`agenda-block ${categoryClass(event)}`}>
            <p className="agenda-title">{event.title}</p>
            <p className="agenda-sub">
              {event.autoAdded ? "Auto-added from your routine" : event.locked ? "Fixed" : `${event.durationMinutes} min`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
