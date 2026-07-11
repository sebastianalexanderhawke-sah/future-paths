import type { FutureSelfTrend } from "@/lib/future-self-trend";

/**
 * The Pattern Emerging card's trajectory language. A pure presentation
 * derivation over the trend the row already carries (percentage vs
 * previous_percentage — see future-self-trend.ts): no recognition, no new
 * scoring, no storage. The card speaks in these human states instead of
 * numbers; the underlying delta still exists for anything analytical.
 *
 * The state list is deliberately an extensible union: future versions can
 * add richer states (e.g. "returning", "surging") without touching the
 * card's layout, which renders whatever glyph/label/phrase it is given.
 */
export type PatternMomentumState =
  | "emerging"
  | "accelerating"
  | "growing"
  | "steady"
  | "slowing"
  | "fading";

export type PatternMomentum = {
  state: PatternMomentumState;
  /** Direction mark: ▲ strengthening, ■ steady, ▼ weakening. */
  glyph: "▲" | "■" | "▼";
  /** The two-second answer: "Growing", "Holding steady", … */
  label: string;
  /** One human sentence of what that means — never a number. */
  phrase: string;
};

/**
 * A shift of this many points since the last update reads as decisive
 * movement rather than drift. Presentation threshold only.
 */
const STRONG_SHIFT = 8;

export function getPatternMomentum(trend: FutureSelfTrend): PatternMomentum {
  if (trend.direction === "new") {
    return {
      state: "emerging",
      glyph: "▲",
      label: "Just emerging",
      phrase:
        "This pattern appeared in your latest update — too new to have a trajectory yet.",
    };
  }

  if (trend.direction === "up") {
    if (trend.delta >= STRONG_SHIFT) {
      return {
        state: "accelerating",
        glyph: "▲",
        label: "Accelerating",
        phrase:
          "Showing up more often — and more strongly — in what you've been recording.",
      };
    }
    return {
      state: "growing",
      glyph: "▲",
      label: "Growing",
      phrase: "Quietly picking up strength across your recent entries.",
    };
  }

  if (trend.direction === "down") {
    if (trend.delta <= -STRONG_SHIFT) {
      return {
        state: "fading",
        glyph: "▼",
        label: "Fading",
        phrase: "Your recent entries have been moving away from this pattern.",
      };
    }
    return {
      state: "slowing",
      glyph: "▼",
      label: "Slowing",
      phrase: "Appearing a little less often than it was before.",
    };
  }

  return {
    state: "steady",
    glyph: "■",
    label: "Holding steady",
    phrase: "Still present at the same strength as your last update.",
  };
}
