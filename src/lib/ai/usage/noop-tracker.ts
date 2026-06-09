import type { UsageEvent, UsageTracker } from "@/lib/ai/usage/types";

export const noopUsageTracker: UsageTracker = {
  async track(_event: UsageEvent) {
    // Phase 7 Step 0: no-op. Replace with billing/analytics integration later.
  },
};
