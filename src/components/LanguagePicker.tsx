import { useLanguage } from "../i18n/LanguageContext";
import type { Lang } from "../types";

export function LanguagePicker({ onChoose }: { onChoose: () => void }) {
  const { t, setLang } = useLanguage();

  function choose(l: Lang) {
    setLang(l);
    onChoose();
  }

  return (
    <div className="app-shell">
      <div className="onboarding" style={{ justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <p className="app-name" style={{ fontSize: 30, margin: "0 0 8px" }}>
            Tend
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 28px" }}>{t.languagePicker.subtitle}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn primary" style={{ padding: "14px 20px" }} onClick={() => choose("en")}>
              {t.languagePicker.english}
            </button>
            <button className="btn primary" style={{ padding: "14px 20px" }} onClick={() => choose("tr")}>
              {t.languagePicker.turkish}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
