const SESSION_KEY = "tend.sessionId";

function sessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Fire-and-forget usage event. Never throws, never blocks the caller. */
export function track(event: string, properties?: Record<string, unknown>): void {
  try {
    const payload = JSON.stringify({ event, properties, sessionId: sessionId() });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics must never break the app.
  }
}
