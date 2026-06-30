import { describe, expect, it } from "vitest";

import { getFutureSelfExplanation, getFutureSelfTrend } from "@/lib/future-self-trend";

describe("getFutureSelfTrend", () => {
  it("reports 'new' when there is no previous generation to compare against", () => {
    expect(getFutureSelfTrend({ percentage: 22, previous_percentage: null })).toEqual({
      delta: 0,
      direction: "new",
    });
  });

  it("reports 'up' with a positive delta when likelihood grew", () => {
    expect(getFutureSelfTrend({ percentage: 38, previous_percentage: 34 })).toEqual({
      delta: 4,
      direction: "up",
    });
  });

  it("reports 'down' with a negative delta when likelihood shrank", () => {
    expect(getFutureSelfTrend({ percentage: 22, previous_percentage: 29 })).toEqual({
      delta: -7,
      direction: "down",
    });
  });

  it("reports 'flat' with a zero delta when likelihood is unchanged", () => {
    expect(getFutureSelfTrend({ percentage: 30, previous_percentage: 30 })).toEqual({
      delta: 0,
      direction: "flat",
    });
  });
});

describe("getFutureSelfExplanation", () => {
  it("returns null when there is no percentage change", () => {
    expect(
      getFutureSelfExplanation({ percentage: 30, previous_percentage: 30, why_emerging: "" }),
    ).toBeNull();
  });

  it("prefers the AI-authored why_emerging when present, regardless of direction", () => {
    expect(
      getFutureSelfExplanation({
        percentage: 28,
        previous_percentage: 31,
        why_emerging: "A check-in surfaced new evidence for a competing trajectory.",
      }),
    ).toBe("A check-in surfaced new evidence for a competing trajectory.");
  });

  it("falls back to a deterministic decrease explanation when why_emerging is empty", () => {
    expect(
      getFutureSelfExplanation({ percentage: 28, previous_percentage: 31, why_emerging: "" }),
    ).toBe(
      "This identity did not pick up new behavioral evidence recently — it may regain strength as relevant patterns emerge.",
    );
  });

  it("falls back to a deterministic increase explanation when why_emerging is empty", () => {
    expect(
      getFutureSelfExplanation({ percentage: 38, previous_percentage: 34, why_emerging: "" }),
    ).toBe(
      "This identity gained strength in the most recent generation — recent patterns aligned more closely with this trajectory.",
    );
  });
});
