import { useState } from "react";
import type { CalendarEvent, Goal, PlanDiffEntry, PlanQuality } from "../types";
import { requestReplan } from "../lib/replan";

interface Turn {
  role: "user" | "ai";
  text: string;
  diff?: PlanDiffEntry[];
}

const DIFF_ICON: Record<PlanDiffEntry["action"], string> = {
  moved: "↝",
  cancelled: "✕",
  kept: "✓",
  added: "+",
};

export function AssistantScreen({
  goals,
  events,
  onApplyDiff,
  quality,
  onQualityChange,
}: {
  goals: Goal[];
  events: CalendarEvent[];
  onApplyDiff: (diff: PlanDiffEntry[]) => void;
  quality: PlanQuality;
  onQualityChange: (q: PlanQuality) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pendingDiff, setPendingDiff] = useState<PlanDiffEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setTurns((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);
    try {
      const response = await requestReplan({ message, goals, events });
      setTurns((prev) => [...prev, { role: "ai", text: response.summary, diff: response.diff }]);
      setPendingDiff(response.diff.length > 0 ? response.diff : null);
    } finally {
      setLoading(false);
    }
  }

  function applyPendingDiff() {
    if (!pendingDiff) return;
    onApplyDiff(pendingDiff);
    setPendingDiff(null);
    setTurns((prev) => [...prev, { role: "ai", text: "Applied — your calendar is updated." }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 0" }}>
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Plan quality</span>
        <div className="quality-toggle">
          <button className={quality === "careful" ? "active" : ""} onClick={() => onQualityChange("careful")}>
            Careful
          </button>
          <button className={quality === "fast" ? "active" : ""} onClick={() => onQualityChange("fast")}>
            Fast
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
                  Proposed changes
                </p>
                {turn.diff.map((d, j) => (
                  <div className={`diff-line ${d.action}`} key={j}>
                    <span className="diff-icon">{DIFF_ICON[d.action]}</span>
                    <span>
                      {d.before && <span className="before">{d.title}, {d.before}</span>}
                      <span style={{ fontWeight: 600 }}>
                        {d.action === "cancelled" ? `${d.before ? "" : d.title + " — "}cancelled` : d.after}
                      </span>
                      {" — "}
                      <span style={{ color: "var(--muted)" }}>{d.reason}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {pendingDiff && (
          <div className="action-row">
            <button className="btn secondary" onClick={() => setPendingDiff(null)}>
              Adjust
            </button>
            <button className="btn primary" onClick={applyPendingDiff}>
              Apply plan
            </button>
          </div>
        )}
      </div>
      <div className="composer">
        <input
          placeholder="Tell Tend what changed…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="composer-send" onClick={send} aria-label="Send" disabled={loading}>
          ↑
        </button>
      </div>
    </div>
  );
}
