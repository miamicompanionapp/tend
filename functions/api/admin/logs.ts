import { jsonResponse, type Env } from "../_lib/claude";
import { requireAdmin } from "../_lib/db";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!requireAdmin(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const { results } = await env.DB.prepare(`SELECT * FROM ai_request_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(limit, offset)
    .all();

  return jsonResponse({ logs: results });
};
