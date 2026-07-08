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
  "This identity gained strength in the most recent generation — recent patterns aligned more closely with this trajectory.";

const FALLBACK_DECREASE_EXPLANATION =
  "This identity did not pick up new behavioral evidence recently — it may regain strength as relevant patterns emerge.";

/**
 * Any visible percentage change must have a disclosure. The AI-authored
 * `why_emerging` is preferred when present; otherwise this derives a
 * deterministic, evidence-free explanation purely from delta direction —
 * never fabricating specifics the model didn't provide.
 */
export function getFutureSelfExplanation(
  futureSelf: Pick<FutureSelf, "percentage" | "previous_percentage" | "why_emerging">,
): string | null {
  const { delta } = getFutureSelfTrend(futureSelf);

  if (delta === 0) {
    return null;
  }

  if (futureSelf.why_emerging !== "") {
    // why_emerging is one evidence bullet per line (v2); this disclosure is a
    // single explanatory line, so the strongest bullet speaks for it.
    return futureSelf.why_emerging.split("\n")[0];
  }

  return delta > 0 ? FALLBACK_INCREASE_EXPLANATION : FALLBACK_DECREASE_EXPLANATION;
}
