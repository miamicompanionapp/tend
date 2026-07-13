import { getClient, jsonResponse, type Env } from "./_lib/claude";
import { logAiRequest } from "./_lib/db";
import { DIFF_SCHEMA, buildReplanSystemPrompt } from "./_lib/replanCore";
import type { Lang, PlanDiffEntry, ReplanRequest } from "../../src/types";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const startedAt = Date.now();
  let body: ReplanRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.message || !Array.isArray(body.goals) || !Array.isArray(body.events)) {
    return jsonResponse({ error: "message, goals[], and events[] are required" }, 400);
  }

  let client;
  try {
    client = getClient(env);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }

  const language: Lang = body.language === "tr" ? "tr" : "en";
  const historyMessages = (body.history ?? []).map((h) => ({ role: h.role, content: h.content }));
  const model = "claude-opus-4-8";
  const logCtx = { sessionId: body.sessionId, userAgent: request.headers.get("user-agent") ?? undefined };

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: buildReplanSystemPrompt(language, body.now, body.notes),
      thinking: { type: "adaptive" },
      messages: [
        ...historyMessages,
        {
          role: "user",
          content: `Current date and time: ${body.now ?? "(not provided)"}\n\nDisruption: ${body.message}\n\nGoals:\n${JSON.stringify(body.goals, null, 2)}\n\nToday's events:\n${JSON.stringify(body.events, null, 2)}\n\nWork through the scheduling arithmetic, then call return_replan with your final answer.`,
        },
      ],
      tools: [
        {
          name: "return_replan",
          description: "Return the proposed plan changes",
          input_schema: DIFF_SCHEMA,
        },
      ],
      tool_choice: { type: "auto" },
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      context.waitUntil(
        logAiRequest(env, { endpoint: "replan", model, requestBody: body, success: false, error: "Claude did not return a replan", durationMs: Date.now() - startedAt, ...logCtx }),
      );
      return jsonResponse({ error: "Claude did not return a replan" }, 502);
    }

    const result = toolUse.input as { summary: string; diff: PlanDiffEntry[] };
    context.waitUntil(
      logAiRequest(env, { endpoint: "replan", model, requestBody: body, responseBody: result, success: true, durationMs: Date.now() - startedAt, ...logCtx }),
    );
    return jsonResponse(result);
  } catch (err) {
    const message = (err as Error).message;
    context.waitUntil(
      logAiRequest(env, { endpoint: "replan", model, requestBody: body, success: false, error: message, durationMs: Date.now() - startedAt, ...logCtx }),
    );
    return jsonResponse({ error: message }, 502);
  }
};
