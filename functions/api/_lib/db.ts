import type { Env } from "./claude";

export async function logAiRequest(
  env: Env,
  entry: {
    endpoint: string;
    model?: string;
    quality?: string;
    requestBody: unknown;
    responseBody?: unknown;
    success: boolean;
    error?: string;
    durationMs: number;
  },
): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO ai_request_logs (id, endpoint, model, quality, request_body, response_body, success, error, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        entry.endpoint,
        entry.model ?? null,
        entry.quality ?? null,
        JSON.stringify(entry.requestBody),
        entry.responseBody != null ? JSON.stringify(entry.responseBody) : null,
        entry.success ? 1 : 0,
        entry.error ?? null,
        entry.durationMs,
        new Date().toISOString(),
      )
      .run();
  } catch {
    // Logging is best-effort — never let it break the actual request.
  }
}

export function requireAdmin(request: Request, env: Env): boolean {
  const token = request.headers.get("x-admin-token");
  return !!env.ADMIN_TOKEN && token === env.ADMIN_TOKEN;
}
