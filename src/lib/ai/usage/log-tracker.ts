import type { UsageEvent, UsageTracker } from "@/lib/ai/usage/types";

/**
 * Emits one structured log line per AI generation — the operational record of
 * cost and latency (prompt, provider, duration, tokens, cache hits) that
 * replaced the per-stage [PROFILE] debug logging. Grep for "[ai-usage]".
 */
export const logUsageTracker: UsageTracker = {
  async track(event: UsageEvent) {
    console.log(`[ai-usage] ${JSON.stringify(event)}`);
  },
};
