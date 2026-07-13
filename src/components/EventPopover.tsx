import type { CalendarEvent } from "../types";
import { eventStyleClass } from "../lib/category";
import { formatEventSlot } from "../lib/schedule";
import { useLanguage } from "../i18n/LanguageContext";

export function EventPopover({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { t, lang } = useLanguage();

  return (
    <div className="event-popover-overlay" onClick={onClose}>
      <div className={`event-popover ${eventStyleClass(event)}`} onClick={(e) => e.stopPropagation()}>
        <div className="event-popover-header">
          <p className="event-popover-title">{event.title}</p>
          <button className="event-popover-close" onClick={onClose} aria-label={t.today.closeAria}>
            ×
          </button>
        </div>
        <p className="event-popover-time">{formatEventSlot(event, lang)}</p>
        {(event.locked || event.autoAdded) && (
          <div className="event-popover-tags">
            {event.locked && <span className="goal-chip chip-fixed">{t.today.fixed}</span>}
            {event.autoAdded && <span className="event-popover-note">{t.today.autoAdded}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
