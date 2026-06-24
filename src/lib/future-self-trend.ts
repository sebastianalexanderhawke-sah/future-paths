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

const FALLBACK_INCREASE_EXPLANATION =
  "This trajectory gained relative likelihood because recent evidence aligned more closely with this direction than with competing trajectories.";

const FALLBACK_DECREASE_EXPLANATION =
  "This trajectory did not gain new supporting evidence, but other trajectories strengthened more strongly, reducing its relative likelihood.";

/**
 * Any visible percentage change must have a disclosure. The AI-authored
 * `why_changed` is preferred when present; otherwise this derives a
 * deterministic, evidence-free explanation purely from delta direction —
 * never fabricating specifics the model didn't provide.
 */
export function getFutureSelfExplanation(
  futureSelf: Pick<FutureSelf, "percentage" | "previous_percentage" | "why_changed">,
): string | null {
  const { delta } = getFutureSelfTrend(futureSelf);

  if (delta === 0) {
    return null;
  }

  if (futureSelf.why_changed !== "") {
    return futureSelf.why_changed;
  }

  return delta > 0 ? FALLBACK_INCREASE_EXPLANATION : FALLBACK_DECREASE_EXPLANATION;
}
