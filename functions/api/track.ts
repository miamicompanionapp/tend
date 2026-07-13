import { jsonResponse, type Env } from "./_lib/claude";

interface TrackRequest {
  event?: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: TrackRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.event) {
    return jsonResponse({ error: "event is required" }, 400);
  }

  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO analytics_events (id, event_name, properties, session_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          body.event,
          body.properties ? JSON.stringify(body.properties) : null,
          body.sessionId ?? null,
          new Date().toISOString(),
        )
        .run();
    } catch {
      // Analytics is best-effort only.
    }
  }

  return jsonResponse({ ok: true });
};
