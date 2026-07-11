import { END_HOUR, HOUR_HEIGHT, START_HOUR } from "../lib/timeGridLayout";

function hourLabel(hour: number): string {
  const period = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

export function HourRuler() {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  return (
    <div className="hour-ruler" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
      {hours.map((hour) => (
        <span className="hour-ruler-label" key={hour} style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}>
          {hourLabel(hour)}
        </span>
      ))}
    </div>
  );
}
