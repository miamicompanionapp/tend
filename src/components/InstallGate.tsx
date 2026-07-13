import { useEffect, useState, type ReactNode } from "react";
import {
  INSTALL_BYPASS_KEY,
  detectAndroidBrowser,
  detectPlatform,
  isRunningAsPwa,
  type AndroidBrowser,
  type InstallPlatform,
} from "../lib/pwa";
import { useLanguage } from "../i18n/LanguageContext";
import { Logo } from "./Logo";
import { track } from "../lib/analytics";

export function InstallGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [installed, setInstalled] = useState(() => isRunningAsPwa());
  const [platform, setPlatform] = useState<InstallPlatform>(() => detectPlatform());
  const [browser, setBrowser] = useState<AndroidBrowser>(() => detectAndroidBrowser());

  useEffect(() => {
    if (installed) return;
    const recheck = () => setInstalled(isRunningAsPwa());
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      mq.removeEventListener?.("change", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [installed]);

  if (installed) return <>{children}</>;

  const steps =
    platform === "ios" ? t.installGate.iosSteps : platform === "desktop" ? t.installGate.desktopSteps : t.installGate.androidSteps[browser];

  function continueInBrowser() {
    track("install_gate_bypassed", { platform });
    localStorage.setItem(INSTALL_BYPASS_KEY, "1");
    setInstalled(true);
  }

  return (
    <div className="app-shell">
      <div className="onboarding">
        <div className="onboarding-content">
          <Logo size={40} className="install-gate-icon" />
          <p className="app-name" style={{ fontSize: 26, margin: "0 0 4px" }}>
            {t.installGate.title}
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 20px" }}>{t.installGate.subtitle}</p>

          <div className="install-gate-tabs">
            <button className={platform === "ios" ? "active" : ""} onClick={() => setPlatform("ios")}>
              {t.installGate.iosTab}
            </button>
            <button className={platform === "android" ? "active" : ""} onClick={() => setPlatform("android")}>
              {t.installGate.androidTab}
            </button>
            <button className={platform === "desktop" ? "active" : ""} onClick={() => setPlatform("desktop")}>
              {t.installGate.desktopTab}
            </button>
          </div>

          {platform === "android" && (
            <div className="install-gate-browser-pick">
              <label htmlFor="install-gate-browser">{t.installGate.browserQuestion}</label>
              <select id="install-gate-browser" value={browser} onChange={(e) => setBrowser(e.target.value as AndroidBrowser)}>
                {(Object.keys(t.installGate.browsers) as AndroidBrowser[]).map((b) => (
                  <option key={b} value={b}>
                    {t.installGate.browsers[b]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ol className="install-gate-steps">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <button className="install-gate-continue" onClick={continueInBrowser}>
          {t.installGate.continueLink}
        </button>
      </div>
    </div>
  );
}
