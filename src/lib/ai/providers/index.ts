import {
  getIdentityEngineMode,
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

  return mockProvider;
}

export { claudeProvider } from "@/lib/ai/providers/claude-provider";
export { mockProvider } from "@/lib/ai/providers/mock-provider";
