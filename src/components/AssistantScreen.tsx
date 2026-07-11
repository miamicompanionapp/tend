import { useState } from "react";
import type { CalendarEvent, Goal, PlanDiffEntry, PlanQuality, ReplanHistoryTurn } from "../types";
import { requestReplan } from "../lib/replan";
import { useLanguage } from "../i18n/LanguageContext";
import { formatEventSlot } from "../lib/schedule";
import { nowLocalISO } from "../lib/date";

interface DisplayDiffEntry extends PlanDiffEntry {
  beforeDisplay?: string;
  afterDisplay?: string;
}

interface Turn {
  role: "user" | "ai";
  text: string;
  diff?: DisplayDiffEntry[];
  applied?: boolean;
}

const DIFF_ICON: Record<PlanDiffEntry["action"], string> = {
  moved: "↝",
  cancelled: "✕",
  kept: "✓",
  added: "+",
};

/** Turns a diff into plain text so a later turn's history entry tells Claude exactly what it proposed. */
function describeDiffForHistory(diff: DisplayDiffEntry[], applied: boolean): string {
  const lines = diff.map((d) => {
    const slot = d.action === "cancelled" ? d.beforeDisplay : d.afterDisplay;
    return `- ${d.title}: ${d.action}${slot ? ` (${slot})` : ""} — ${d.reason}`;
  });
  const status = applied ? "This was applied to the calendar." : "This was only proposed, not applied yet.";
  return `Proposed changes:\n${lines.join("\n")}\n${status}`;
}

export function AssistantScreen({
  goals,
  events,
  notes,
  onApplyDiff,
  quality,
  onQualityChange,
}: {
  goals: Goal[];
  events: CalendarEvent[];
  notes: string;
  onApplyDiff: (diff: PlanDiffEntry[]) => void;
  quality: PlanQuality;
  onQualityChange: (q: PlanQuality) => void;
}) {
  const { t, lang } = useLanguage();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pendingDiff, setPendingDiff] = useState<PlanDiffEntry[] | null>(null);
  const [pendingDiffIndex, setPendingDiffIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");

    const history: ReplanHistoryTurn[] = turns.map((turn) =>
      turn.role === "user"
        ? { role: "user", content: turn.text }
        : { role: "assistant", content: turn.diff && turn.diff.length > 0 ? `${turn.text}\n\n${describeDiffForHistory(turn.diff, !!turn.applied)}` : turn.text },
    );

    setTurns((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);
    try {
      const response = await requestReplan({ message, goals, events, language: lang, now: nowLocalISO(), history, notes: notes || undefined });
      // Compute before/after display from the real event data (not the AI's
      // free-text before/after, which drifts in format and can't be fully
      // trusted) — snapshot against `events` now, since it reflects the
      // state the diff was actually proposed against.
      const diffWithDisplay: DisplayDiffEntry[] = response.diff.map((d) => {
        const original = events.find((e) => e.id === d.eventId);
        return {
          ...d,
          beforeDisplay: original ? formatEventSlot(original, lang) : d.before,
          afterDisplay: d.event ? formatEventSlot(d.event, lang) : d.after,
        };
      });
      setTurns((prev) => {
        const next = [...prev, { role: "ai" as const, text: response.summary, diff: diffWithDisplay }];
        setPendingDiffIndex(diffWithDisplay.length > 0 ? next.length - 1 : null);
        return next;
      });
      setPendingDiff(response.diff.length > 0 ? response.diff : null);
    } finally {
      setLoading(false);
    }
  }

  function applyPendingDiff() {
    if (!pendingDiff) return;
    onApplyDiff(pendingDiff);
    if (pendingDiffIndex !== null) {
      setTurns((prev) => prev.map((turn, i) => (i === pendingDiffIndex ? { ...turn, applied: true } : turn)));
    }
    setPendingDiff(null);
    setPendingDiffIndex(null);
    setTurns((prev) => [...prev, { role: "ai", text: t.assistant.applied }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 0" }}>
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{t.assistant.planQuality}</span>
        <div className="quality-toggle">
          <button className={quality === "careful" ? "active" : ""} onClick={() => onQualityChange("careful")}>
            {t.quality.careful}
          </button>
          <button className={quality === "fast" ? "active" : ""} onClick={() => onQualityChange("fast")}>
            {t.quality.fast}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {turns.map((turn, i) => (
          <div key={i}>
            <div className={`bubble-row ${turn.role === "user" ? "user" : ""}`}>
              <div className={`bubble ${turn.role === "user" ? "user" : "ai"}`}>{turn.text}</div>
            </div>
            {turn.diff && turn.diff.length > 0 && (
              <div className="diff-card">
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", margin: "0 0 10px" }}>
                  {t.assistant.proposedChanges}
                </p>
                {turn.diff.map((d, j) => {
                  const showBefore = (d.action === "moved" || d.action === "cancelled") && d.beforeDisplay;
                  return (
                    <div className={`diff-line ${d.action}`} key={j}>
                      <span className="diff-icon">{DIFF_ICON[d.action]}</span>
                      <span>
                        {showBefore && (
                          <span className="before">
                            {d.title}, {d.beforeDisplay}
                          </span>
                        )}
                        <span style={{ fontWeight: 600 }}>
                          {d.action === "cancelled"
                            ? `${showBefore ? "" : d.title + " — "}${t.assistant.cancelledSuffix}`
                            : d.action === "kept"
                              ? d.title
                              : d.afterDisplay}
                        </span>
                        {" — "}
                        <span style={{ color: "var(--muted)" }}>{d.reason}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {pendingDiff && (
          <div className="action-row">
            <button className="btn secondary" onClick={() => setPendingDiff(null)}>
              {t.assistant.adjust}
            </button>
            <button className="btn primary" onClick={applyPendingDiff}>
              {t.assistant.applyPlan}
            </button>
          </div>
        )}
      </div>
      <div className="composer">
        <input
          placeholder={t.assistant.composerPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="composer-send" onClick={send} aria-label={t.assistant.sendAria} disabled={loading}>
          ↑
        </button>
      </div>
    </div>
  );
}
