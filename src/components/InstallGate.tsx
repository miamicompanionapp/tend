import { useEffect, useState, type ReactNode } from "react";
import {
  INSTALL_BYPASS_KEY,
  detectAndroidBrowser,
  detectPlatform,
  isRunningAsPwa,
  type AndroidBrowser,
  type InstallPlatform,
} from "../lib/pwa";

const IOS_STEPS = [
  "Tap the Share icon (square with an arrow) in Safari's toolbar.",
  'Scroll down and tap "Add to Home Screen".',
  'Tap "Add" in the top right.',
];

const DESKTOP_STEPS = [
  "Click the install icon (⊕) in the address bar, or open the browser menu.",
  'Click "Install Tend".',
  "Tend opens in its own window, just like a native app.",
];

const ANDROID_STEPS: Record<AndroidBrowser, string[]> = {
  chrome: ["Tap the ⋮ menu in the top right.", 'Tap "Add to Home screen" or "Install app".', 'Tap "Install" to confirm.'],
  samsung: ["Tap the ☰ menu.", 'Tap "Add page to", then "Home screen".', 'Tap "Add".'],
  firefox: ["Tap the ⋮ menu.", 'Tap "Install".', "Confirm the install."],
  edge: ["Tap the ⋯ menu.", 'Tap "Add to phone" or "Install app".', 'Confirm "Install".'],
};

const BROWSER_LABEL: Record<AndroidBrowser, string> = {
  chrome: "Chrome",
  samsung: "Samsung Internet",
  firefox: "Firefox",
  edge: "Edge",
};

export function InstallGate({ children }: { children: ReactNode }) {
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

  const steps = platform === "ios" ? IOS_STEPS : platform === "desktop" ? DESKTOP_STEPS : ANDROID_STEPS[browser];

  function continueInBrowser() {
    localStorage.setItem(INSTALL_BYPASS_KEY, "1");
    setInstalled(true);
  }

  return (
    <div className="app-shell">
      <div className="onboarding">
        <div className="onboarding-content">
          <p className="install-gate-icon">📅</p>
          <p className="app-name" style={{ fontSize: 26, margin: "0 0 4px" }}>
            Add Tend to your home screen
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 20px" }}>
            Tend works best installed like a real app — no browser bar, full screen, one tap to open.
          </p>

          <div className="install-gate-tabs">
            <button className={platform === "ios" ? "active" : ""} onClick={() => setPlatform("ios")}>
              🍏 iPhone / iPad
            </button>
            <button className={platform === "android" ? "active" : ""} onClick={() => setPlatform("android")}>
              🤖 Android
            </button>
            <button className={platform === "desktop" ? "active" : ""} onClick={() => setPlatform("desktop")}>
              💻 Desktop
            </button>
          </div>

          {platform === "android" && (
            <div className="install-gate-browser-pick">
              <label htmlFor="install-gate-browser">Which browser are you using?</label>
              <select id="install-gate-browser" value={browser} onChange={(e) => setBrowser(e.target.value as AndroidBrowser)}>
                {(Object.keys(BROWSER_LABEL) as AndroidBrowser[]).map((b) => (
                  <option key={b} value={b}>
                    {BROWSER_LABEL[b]}
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
          Continue in browser instead
        </button>
      </div>
    </div>
  );
}
