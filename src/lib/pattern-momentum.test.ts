import { describe, expect, it } from "vitest";

import { getFutureSelfTrend } from "@/lib/future-self-trend";
import { getPatternMomentum } from "@/lib/pattern-momentum";

// The momentum vocabulary: trend → human trajectory. Pinned so the card's
// wording stays a deliberate choice, and so no state ever leaks a number
// into its language.

function momentumFor(percentage: number, previous: number | null) {
  return getPatternMomentum(getFutureSelfTrend({ percentage, previous_percentage: previous }));
}

describe("getPatternMomentum", () => {
  it("calls a strong rise Accelerating", () => {
    const momentum = momentumFor(48, 40);
    expect(momentum).toMatchObject({
      state: "accelerating",
      glyph: "▲",
      label: "Accelerating",
    });
  });

  it("calls a gentle rise Growing", () => {
    expect(momentumFor(43, 40)).toMatchObject({
      state: "growing",
      glyph: "▲",
      label: "Growing",
    });
  });

  it("calls no movement Holding steady", () => {
    expect(momentumFor(40, 40)).toMatchObject({
      state: "steady",
      glyph: "■",
      label: "Holding steady",
    });
  });

  it("calls a gentle decline Slowing", () => {
    expect(momentumFor(37, 40)).toMatchObject({
      state: "slowing",
      glyph: "▼",
      label: "Slowing",
    });
  });

  it("calls a strong decline Fading", () => {
    expect(momentumFor(32, 40)).toMatchObject({
      state: "fading",
      glyph: "▼",
      label: "Fading",
    });
  });

  it("treats a pattern without history as Just emerging", () => {
    expect(momentumFor(30, null)).toMatchObject({
      state: "emerging",
      glyph: "▲",
      label: "Just emerging",
    });
  });

  it("never speaks in numbers", () => {
    for (const [pct, prev] of [
      [48, 40],
      [43, 40],
      [40, 40],
      [37, 40],
      [32, 40],
      [30, null],
    ] as const) {
      const momentum = momentumFor(pct, prev);
      expect(momentum.label).not.toMatch(/\d/);
      expect(momentum.phrase).not.toMatch(/\d/);
    }
  });
});
