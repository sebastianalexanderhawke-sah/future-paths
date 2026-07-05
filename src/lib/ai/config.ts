import type { IdentityEngineMode, IdentityEngineProviderId } from "@/lib/ai/types";
import { IDENTITY_ENGINE_MODES } from "@/lib/ai/types";

export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_GENERATION_TIMEOUT_MS = 30_000;

function parseMode(value: string | undefined): IdentityEngineMode {
  if (value && IDENTITY_ENGINE_MODES.includes(value as IdentityEngineMode)) {
    return value as IdentityEngineMode;
  }

  return "mock";
}

export function getIdentityEngineMode(): IdentityEngineMode {
  return parseMode(process.env.IDENTITY_ENGINE_MODE);
}

export function getAnthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key || undefined;
}

export function getClaudeModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
}

export function getGenerationTimeoutMs(): number {
  const raw = process.env.IDENTITY_ENGINE_TIMEOUT_MS;

  if (!raw) {
    return DEFAULT_GENERATION_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_GENERATION_TIMEOUT_MS;
}

export function resolveProviderForMode(
  mode: IdentityEngineMode = getIdentityEngineMode(),
): IdentityEngineProviderId {
  if (mode === "mock") {
    return "mock";
  }

  if (mode === "claude") {
    return "claude";
  }

  return getAnthropicApiKey() ? "claude" : "mock";
}

// Note: there is intentionally no "fall back to mock on error" facility.
// Every structured generation is persisted as durable user data, and
// fabricated mock content must never be stored as if it were real analysis.
// In "auto" mode the mock provider is used only when no API key is
// configured (a development setup), never as a silent failure mask.
