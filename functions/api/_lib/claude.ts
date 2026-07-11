import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string;
}

export function getClient(env: Env): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it as an encrypted Secret in the Cloudflare Pages project (Settings → Variables and Secrets), not a plaintext build var.",
    );
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
