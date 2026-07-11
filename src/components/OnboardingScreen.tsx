import { useState } from "react";
import type { PlanQuality } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

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
  const { t } = useLanguage();
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
            {t.onboarding.title}
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 24px" }}>{t.onboarding.subtitle}</p>

          <div className="onboarding-step">
            <span className="onboarding-step-num">1</span>
            <div>
              <p className="onboarding-step-title">{t.onboarding.step1Title}</p>
              <p className="onboarding-step-body">{t.onboarding.step1Body}</p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="onboarding-step-num">2</span>
            <div>
              <p className="onboarding-step-title">{t.onboarding.step2Title}</p>
              <p className="onboarding-step-body">{t.onboarding.step2Body}</p>
            </div>
          </div>
          <div className="onboarding-step">
            <span className="onboarding-step-num">3</span>
            <div>
              <p className="onboarding-step-title">{t.onboarding.step3Title}</p>
              <p className="onboarding-step-body">{t.onboarding.step3Body}</p>
            </div>
          </div>

          <p className="field-label" style={{ marginTop: 24 }}>
            {t.onboarding.qualityLabel}
          </p>
          <div className="quality-toggle" style={{ width: "fit-content" }}>
            <button className={quality === "careful" ? "active" : ""} onClick={() => onQualityChange("careful")}>
              {t.quality.careful}
            </button>
            <button className={quality === "fast" ? "active" : ""} onClick={() => onQualityChange("fast")}>
              {t.quality.fast}
            </button>
          </div>
          <p className="field-hint">{t.onboarding.qualityHint}</p>

          <p className="field-label" style={{ marginTop: 20 }}>
            {t.onboarding.notesLabel}
          </p>
          <textarea
            placeholder={t.onboarding.notesPlaceholder}
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
          <p className="field-hint">{t.onboarding.notesHint}</p>
        </div>

        <button className="btn primary" style={{ margin: 16 }} onClick={finish}>
          {t.onboarding.continueButton}
        </button>
      </div>
    </div>
  );
}
