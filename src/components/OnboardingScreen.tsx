import { useRef, useState } from "react";
import type { PlanQuality } from "../types";
import { useLanguage } from "../i18n/LanguageContext";
import { track } from "../lib/analytics";

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
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // welcome slide + one per differentiator card + final quality/CTA slide
  const totalSlides = t.onboarding.cards.length + 2;
  const isLast = index === totalSlides - 1;

  function handleScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goNext() {
    if (isLast) {
      track("onboarding_completed", { quality });
      onComplete();
      return;
    }
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: (index + 1) * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <div className="onboarding">
        <div className="onboarding-slides" ref={trackRef} onScroll={handleScroll}>
          <div className="onboarding-slide">
            <span className="onboarding-slide-icon">👋</span>
            <p className="onboarding-slide-title">{t.onboarding.title}</p>
            <p className="onboarding-slide-body">{t.onboarding.welcomeBody}</p>
            <p className="onboarding-swipe-hint">{t.onboarding.swipeHint}</p>
          </div>

          {t.onboarding.cards.map((card, i) => (
            <div className="onboarding-slide" key={i}>
              <span className="onboarding-slide-icon">{card.icon}</span>
              <p className="onboarding-slide-title">{card.title}</p>
              <p className="onboarding-slide-body">{card.body}</p>
            </div>
          ))}

          <div className="onboarding-slide">
            <span className="onboarding-slide-icon">⚙️</span>
            <p className="onboarding-slide-title">{t.onboarding.qualityLabel}</p>
            <p className="onboarding-slide-body">{t.onboarding.qualityHint}</p>
            <div className="quality-toggle" style={{ marginTop: 18 }}>
              <button className={quality === "careful" ? "active" : ""} onClick={() => onQualityChange("careful")}>
                {t.quality.careful}
              </button>
              <button className={quality === "fast" ? "active" : ""} onClick={() => onQualityChange("fast")}>
                {t.quality.fast}
              </button>
            </div>
          </div>
        </div>

        <div className="onboarding-dots">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <span key={i} className={`onboarding-dot${i === index ? " active" : ""}`} />
          ))}
        </div>

        <div className="onboarding-footer">
          <button className="btn primary" onClick={goNext}>
            {isLast ? t.onboarding.continueButton : t.onboarding.next}
          </button>
        </div>
      </div>
    </div>
  );
}
