import { useLanguage } from "../i18n/LanguageContext";
import { HOUR_HEIGHT } from "../lib/timeGridLayout";

function hourLabel(hour: number, lang: "en" | "tr"): string {
  if (lang === "tr") return `${hour}:00`;
  const period = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

export function HourRuler({ startHour, endHour }: { startHour: number; endHour: number }) {
  const { lang } = useLanguage();
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  return (
    <div className="hour-ruler" style={{ height: (endHour - startHour) * HOUR_HEIGHT }}>
      {hours.map((hour) => (
        <span className="hour-ruler-label" key={hour} style={{ top: (hour - startHour) * HOUR_HEIGHT }}>
          {hourLabel(hour, lang)}
        </span>
      ))}
    </div>
  );
}
