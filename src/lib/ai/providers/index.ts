import {
  getIdentityEngineMode,
  isMockAllowedInProduction,
  isProductionRuntime,
  IdentityEngineConfigError,
  resolveProviderForMode,
} from "@/lib/ai/config";
import { claudeProvider } from "@/lib/ai/providers/claude-provider";
import { mockProvider } from "@/lib/ai/providers/mock-provider";
import type { IdentityAIProvider } from "@/lib/ai/providers/types";
import type { IdentityEngineProviderId } from "@/lib/ai/types";

export function getIdentityAIProvider(
  preferredProvider?: IdentityEngineProviderId,
): IdentityAIProvider {
  const providerId = preferredProvider ?? resolveProviderForMode(getIdentityEngineMode());

  if (providerId === "claude") {
    return claudeProvider;
  }

  // Fail closed: every caller persists generation output as durable user
  // data, so production must never reach the mock provider through a missing
  // env var, a typo, or auto mode without an API key. Only an explicit
  // IDENTITY_ENGINE_ALLOW_MOCK=true opt-in permits it.
  if (isProductionRuntime() && !isMockAllowedInProduction()) {
    throw new IdentityEngineConfigError(
      "Identity Engine misconfigured: the mock AI provider was selected in production. " +
        "Set IDENTITY_ENGINE_MODE=claude with a valid ANTHROPIC_API_KEY, or set " +
        "IDENTITY_ENGINE_ALLOW_MOCK=true to explicitly allow mock output.",
    );
  }

  return mockProvider;
}

export { claudeProvider } from "@/lib/ai/providers/claude-provider";
export { mockProvider } from "@/lib/ai/providers/mock-provider";
