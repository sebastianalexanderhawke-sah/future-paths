import type { FutureSelf } from "@/types/database";

export type FutureSelfTrendDirection = "up" | "down" | "flat" | "new";

export type FutureSelfTrend = {
  delta: number;
  direction: FutureSelfTrendDirection;
};

export function getFutureSelfTrend(
  futureSelf: Pick<FutureSelf, "percentage" | "previous_percentage">,
): FutureSelfTrend {
  if (futureSelf.previous_percentage === null) {
    return { delta: 0, direction: "new" };
  }

  const delta = futureSelf.percentage - futureSelf.previous_percentage;

  if (delta > 0) {
    return { delta, direction: "up" };
  }

  if (delta < 0) {
    return { delta, direction: "down" };
  }

  return { delta, direction: "flat" };
}
