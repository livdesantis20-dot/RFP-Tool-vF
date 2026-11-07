import Anthropic from "@anthropic-ai/sdk";

// Reads ANTHROPIC_API_KEY from the environment (.env.local locally, project env vars on Vercel).
let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export function aiConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function describeAiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Anthropic API key is invalid or missing.";
  if (e instanceof Anthropic.RateLimitError) return "Anthropic rate limit hit — try again shortly.";
  if (e instanceof Anthropic.BadRequestError) return `Model request rejected: ${e.message}`;
  if (e instanceof Anthropic.APIError) return `Anthropic API error ${e.status}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}
