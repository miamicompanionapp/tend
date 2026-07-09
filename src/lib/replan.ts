import type { ReplanRequest, ReplanResponse } from "../types";

/**
 * Sends the current goals + events plus a free-text disruption to the planning
 * backend, which prompts Claude to propose a diff. Never mutates state itself —
 * callers apply the diff only after the user approves it.
 *
 * TODO: point this at a real backend endpoint (e.g. /api/replan) that holds the
 * Anthropic API key server-side. Never call the Claude API directly from the
 * client — that would ship the key to every device the PWA is installed on.
 */
export async function requestReplan(req: ReplanRequest): Promise<ReplanResponse> {
  try {
    const res = await fetch("/api/replan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.ok) return res.json();
  } catch {
    // no backend wired up yet during early scaffolding — fall through to the mock
  }
  return mockReplan(req);
}

/**
 * Stand-in so the Assistant screen is demoable before the real backend exists.
 * Delete once /api/replan is live.
 */
function mockReplan(req: ReplanRequest): ReplanResponse {
  const urgent = /vet|emergency|urgent/i.test(req.message);
  if (!urgent) {
    return {
      summary: "Noted — I didn't find anything on today's plan that conflicts with that.",
      diff: [],
    };
  }
  const run = req.events.find((e) => e.title.toLowerCase().includes("run"));
  const dinner = req.events.find((e) => e.title.toLowerCase().includes("dinner") && !e.autoAdded);
  return {
    summary: "Got it — that's more urgent than everything else this afternoon. Here's what I'd change:",
    diff: [
      ...(run
        ? [
            {
              action: "moved" as const,
              eventId: run.id,
              title: run.title,
              before: `today ${run.startTime}`,
              after: "tomorrow, same time",
              reason: "Lower priority than an urgent vet visit",
            },
          ]
        : []),
      {
        action: "cancelled" as const,
        eventId: "goal-dog-nails",
        title: "Trim dog's nails",
        before: "later this week",
        reason: "Vet visit covers this",
      },
      ...(dinner
        ? [
            {
              action: "kept" as const,
              eventId: dinner.id,
              title: dinner.title,
              after: "pushed 30 min later",
              reason: "High priority — shifted instead of dropped",
            },
          ]
        : []),
    ],
  };
}
