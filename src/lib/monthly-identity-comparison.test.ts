import { describe, expect, it } from "vitest";

import { computeMonthlyComparison } from "@/lib/monthly-identity-comparison";
import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";

function buildMonth(overrides: Partial<MonthlyIdentityEvolution> = {}): MonthlyIdentityEvolution {
  return {
    month: "June 2026",
    dominantThemes: [],
    majorDecisions: [],
    futureShifts: [],
    identityChangeEvidence: {
      identityUpdates: [],
      chosenPaths: [],
      dominantThemes: [],
      futureShifts: [],
    },
    ...overrides,
  };
}

describe("computeMonthlyComparison", () => {
  it("flags a theme as increased when it's newly appearing", () => {
    const current = buildMonth({ dominantThemes: ["Courage"] });
    const previous = buildMonth({ dominantThemes: [] });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: ["Courage"],
      decreased: [],
    });
  });

  it("flags a theme as decreased when it disappears", () => {
    const current = buildMonth({ dominantThemes: [] });
    const previous = buildMonth({ dominantThemes: ["Avoidance"] });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: [],
      decreased: ["Avoidance"],
    });
  });

  it("flags a theme as increased when its frequency rank improves", () => {
    const current = buildMonth({ dominantThemes: ["Courage", "Independence"] });
    const previous = buildMonth({ dominantThemes: ["Independence", "Courage"] });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: ["Courage"],
      decreased: ["Independence"],
    });
  });

  it("does not flag a theme that holds the same rank", () => {
    const current = buildMonth({ dominantThemes: ["Courage", "Independence"] });
    const previous = buildMonth({ dominantThemes: ["Courage", "Independence"] });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: [],
      decreased: [],
    });
  });

  it("flags a future trajectory as increased when its net movement strengthens", () => {
    const current = buildMonth({
      futureShifts: [{ futureName: "Trades comfort for courage", delta: 36 }],
    });
    const previous = buildMonth({
      futureShifts: [{ futureName: "Trades comfort for courage", delta: 20 }],
    });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: ["Trades comfort for courage"],
      decreased: [],
    });
  });

  it("flags a future trajectory as decreased when its net movement weakens", () => {
    const current = buildMonth({
      futureShifts: [{ futureName: "Trades comfort for courage", delta: 5 }],
    });
    const previous = buildMonth({
      futureShifts: [{ futureName: "Trades comfort for courage", delta: 20 }],
    });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: [],
      decreased: ["Trades comfort for courage"],
    });
  });

  it("flags a future trajectory as decreased when it vanishes entirely", () => {
    const current = buildMonth({ futureShifts: [] });
    const previous = buildMonth({
      futureShifts: [{ futureName: "Quietly cutting ties", delta: 5 }],
    });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: [],
      decreased: ["Quietly cutting ties"],
    });
  });

  it("does not flag a future trajectory that only appears in the current month", () => {
    const current = buildMonth({
      futureShifts: [{ futureName: "New trajectory", delta: 12 }],
    });
    const previous = buildMonth({ futureShifts: [] });

    expect(computeMonthlyComparison(current, previous)).toEqual({
      increased: [],
      decreased: [],
    });
  });

  it("caps increased and decreased at 3 items each", () => {
    const current = buildMonth({
      dominantThemes: ["A", "B", "C", "D"],
      futureShifts: [
        { futureName: "F1", delta: 10 },
        { futureName: "F2", delta: 10 },
      ],
    });
    const previous = buildMonth({
      dominantThemes: [],
      futureShifts: [
        { futureName: "F1", delta: 1 },
        { futureName: "F2", delta: 1 },
      ],
    });

    const result = computeMonthlyComparison(current, previous);
    expect(result.increased).toHaveLength(3);
    expect(result.increased).toEqual(["A", "B", "C"]);
  });
});
