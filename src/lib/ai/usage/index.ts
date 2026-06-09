import { noopUsageTracker } from "@/lib/ai/usage/noop-tracker";
import type { UsageTracker } from "@/lib/ai/usage/types";

export type { UsageEvent, UsageTracker } from "@/lib/ai/usage/types";

export function getUsageTracker(): UsageTracker {
  return noopUsageTracker;
}
