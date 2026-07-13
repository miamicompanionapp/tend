import { jsonResponse, type Env } from "../_lib/claude";
import { requireAdmin } from "../_lib/db";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!requireAdmin(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);

  const summary = await env.DB.prepare(`SELECT event_name, COUNT(*) as count FROM analytics_events GROUP BY event_name ORDER BY count DESC`).all();
  const recent = await env.DB.prepare(`SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 200`).all();

  return jsonResponse({ summary: summary.results, recent: recent.results });
};
