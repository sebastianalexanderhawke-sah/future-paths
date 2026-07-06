import { logUsageTracker } from "@/lib/ai/usage/log-tracker";
import type { UsageTracker } from "@/lib/ai/usage/types";

export type { UsageEvent, UsageTracker } from "@/lib/ai/usage/types";

export function getUsageTracker(): UsageTracker {
  return logUsageTracker;
}
