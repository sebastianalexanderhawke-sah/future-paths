import type { IdentityEngineMode, IdentityEngineProviderId } from "@/lib/ai/types";
import { IDENTITY_ENGINE_MODES } from "@/lib/ai/types";

export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_GENERATION_TIMEOUT_MS = 30_000;

/**
 * A misconfigured Identity Engine is a deployment error, not a generation
 * error: it must surface loudly instead of degrading to mock output.
 */
export class IdentityEngineConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityEngineConfigError";
  }
}

function parseMode(value: string | undefined): IdentityEngineMode {
  const trimmed = value?.trim();

  // Absent means "local development, no engine configured" — the mock default
  // (production refuses to run on mock regardless; see getIdentityAIProvider).
  if (!trimmed) {
    return "mock";
  }

  if (IDENTITY_ENGINE_MODES.includes(trimmed as IdentityEngineMode)) {
    return trimmed as IdentityEngineMode;
  }

  // A present-but-unrecognized value is a typo, and a typo must never silently
  // select the mock provider.
  throw new IdentityEngineConfigError(
    `Invalid IDENTITY_ENGINE_MODE "${trimmed}". Expected one of: ${IDENTITY_ENGINE_MODES.join(", ")}.`,
  );
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

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Explicit opt-in for running the mock provider in a production build
 * (e.g. a staging deployment that must not spend AI budget). Without it,
 * production fails closed rather than persisting fabricated analysis.
 */
export function isMockAllowedInProduction(): boolean {
  return process.env.IDENTITY_ENGINE_ALLOW_MOCK?.trim() === "true";
}

// Note: there is intentionally no "fall back to mock on error" facility.
// Every structured generation is persisted as durable user data, and
// fabricated mock content must never be stored as if it were real analysis.
// In "auto" mode the mock provider is used only when no API key is
// configured (a development setup), never as a silent failure mask.
