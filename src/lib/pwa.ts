export const INSTALL_BYPASS_KEY = "tend.installGateBypass";

export type InstallPlatform = "ios" | "android" | "desktop";
export type AndroidBrowser = "chrome" | "samsung" | "firefox" | "edge";

/** True if the app is running installed (standalone) — or the user chose to skip the install gate. */
export function isRunningAsPwa(): boolean {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const bypassed = localStorage.getItem(INSTALL_BYPASS_KEY) === "1";
  return Boolean(standalone || iosStandalone || bypassed);
}

export function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  if (isIOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export function detectAndroidBrowser(): AndroidBrowser {
  const ua = navigator.userAgent || "";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/EdgA|Edge|Edg\//i.test(ua)) return "edge";
  if (/Firefox|FxiOS/i.test(ua)) return "firefox";
  return "chrome";
}
