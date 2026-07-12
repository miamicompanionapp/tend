import type { PlanQuality } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

export function OnboardingScreen({
  quality,
  onQualityChange,
  onComplete,
}: {
  quality: PlanQuality;
  onQualityChange: (q: PlanQuality) => void;
  onComplete: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="app-shell">
      <div className="onboarding">
        <div className="onboarding-content">
          <p className="app-name" style={{ fontSize: 26, margin: "0 0 4px" }}>
            {t.onboarding.title}
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 14px" }}>{t.onboarding.subtitle}</p>

          <div className="onboarding-carousel">
            {t.onboarding.cards.map((card, i) => (
              <div className="onboarding-card" key={i}>
                <span className="onboarding-card-num">{i + 1}</span>
                <p className="onboarding-card-title">{card.title}</p>
                <p className="onboarding-card-body">{card.body}</p>
              </div>
            ))}
          </div>
          <p className="onboarding-swipe-hint">{t.onboarding.swipeHint}</p>

          <p className="field-label" style={{ marginTop: 22 }}>
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
        </div>

        <button className="btn primary" style={{ margin: 16 }} onClick={onComplete}>
          {t.onboarding.continueButton}
        </button>
      </div>
    </div>
  );
}
