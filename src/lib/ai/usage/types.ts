import type { IdentityEngineProviderId } from "@/lib/ai/types";

export type UsageEvent = {
  userId: string;
  promptId: string;
  promptVersion: string;
  provider: IdentityEngineProviderId;
  success: boolean;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};

export interface UsageTracker {
  track(event: UsageEvent): Promise<void>;
}
