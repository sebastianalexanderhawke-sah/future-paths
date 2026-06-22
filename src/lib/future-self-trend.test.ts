import { describe, expect, it } from "vitest";

import { getFutureSelfTrend } from "@/lib/future-self-trend";

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
