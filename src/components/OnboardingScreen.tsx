import { useState } from "react";
import type { PlanQuality } from "../types";

export function OnboardingScreen({
  quality,
  onQualityChange,
  notes,
  onNotesChange,
  onComplete,
}: {
  quality: PlanQuality;
  onQualityChange: (q: PlanQuality) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  onComplete: () => void;
}) {
  const [localNotes, setLocalNotes] = useState(notes);

  function finish() {
    onNotesChange(localNotes.trim());
    onComplete();
  }

  return (
    <div className="app-shell">
      <div className="onboarding">
        <div className="onboarding-content">
          <p className="app-name" style={{ fontSize: 26, margin: "0 0 4px" }}>
            Welcome to Tend
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 24px" }}>
            A calendar that plans itself around your life — and re-plans when life doesn't cooperate.
          </p>

          <div className="onboarding-step">
            <span className="onboarding-step-num">1</span>
            <div>
              <p className="onboarding-step-title">Set your goals</p>
              <p className="onboarding-step-body">
                Work, exercise, family time — anything you want to make room for, on whatever schedule fits.
              </p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="onboarding-step-num">2</span>
            <div>
              <p className="onboarding-step-title">Tap "Generate plan"</p>
              <p className="onboarding-step-body">Tend turns your goals into a real week — fitting everything in, nothing overlapping.</p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="onboarding-step-num">3</span>
            <div>
              <p className="onboarding-step-title">Tell the Assistant when life happens</p>
              <p className="onboarding-step-body">Running late? Something came up? Say so, and Tend re-plans your day around it.</p>
            </div>
          </div>

          <p className="field-label" style={{ marginTop: 24 }}>
            Plan quality
          </p>
          <div className="quality-toggle" style={{ width: "fit-content" }}>
            <button className={quality === "careful" ? "active" : ""} onClick={() => onQualityChange("careful")}>
              Careful
            </button>
            <button className={quality === "fast" ? "active" : ""} onClick={() => onQualityChange("fast")}>
              Fast
            </button>
          </div>
          <p className="field-hint">
            Careful is more consistent but slower (~25s). Fast is quicker but less careful about overlaps and
            preferences. You can change this anytime from the Assistant tab.
          </p>

          <p className="field-label" style={{ marginTop: 20 }}>
            Anything Tend should know?
          </p>
          <textarea
            placeholder="e.g. I have two kids, keep mornings flexible. No exercise before 6am."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 8,
              font: "inherit",
              background: "var(--surface)",
              color: "inherit",
              resize: "vertical",
            }}
          />
          <p className="field-hint">Optional — shared with the planner every time it builds your week. Edit anytime from Goals.</p>
        </div>

        <button className="btn primary" style={{ margin: 16 }} onClick={finish}>
          Let's set up your goals
        </button>
      </div>
    </div>
  );
}
