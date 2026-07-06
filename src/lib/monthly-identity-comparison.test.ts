import { describe, expect, it } from "vitest";

import { computeMonthlyComparison } from "@/lib/monthly-identity-comparison";
import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";
import type { ThemeName } from "@/types/enums";

function buildMonth(overrides: Partial<MonthlyIdentityEvolution> = {}): MonthlyIdentityEvolution {
  return {
    month: "June 2026",
    dominantThemes: [],
    majorDecisions: [],
    futureShifts: [],
    identityChangeEvidence: {
      identityUpdates: [],
      chosenPaths: [],
      checkIns: [],
      dominantThemes: [],
      futureShifts: [],
    },
    ...overrides,
  };
}

function identityUpdate(themes: ThemeName[]) {
  return {
    id: `update-${Math.random()}`,
    title: "An identity update",
    summary: "Summary.",
    themes,
    updateType: "reality_shift" as const,
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

function withIdentityUpdates(...updates: ReturnType<typeof identityUpdate>[]) {
  return buildMonth({
    identityChangeEvidence: {
      identityUpdates: updates,
      chosenPaths: [],
      checkIns: [],
      dominantThemes: [],
      futureShifts: [],
    },
  });
}

describe("computeMonthlyComparison — baseline (no previous month)", () => {
  it("surfaces the month's strongest identity evidence as traitsMorePresent", () => {
    const current = withIdentityUpdates(identityUpdate(["Courage"]));

    const result = computeMonthlyComparison(current, null);
    expect(result.traitsMorePresent).toEqual(["Courage"]);
    expect(result.traitsLessPresent).toEqual([]);
  });

  it("never fabricates a decline when there is no previous month", () => {
    const current = withIdentityUpdates(identityUpdate(["Courage"]), identityUpdate(["Independence"]));

    const result = computeMonthlyComparison(current, null);
    expect(result.traitsLessPresent).toEqual([]);
  });

  it("ranks baseline traits by frequency within the month's identityUpdates", () => {
    const current = withIdentityUpdates(
      identityUpdate(["Courage"]),
      identityUpdate(["Courage"]),
      identityUpdate(["Independence"]),
    );

    const result = computeMonthlyComparison(current, null);
    expect(result.traitsMorePresent).toEqual(["Courage", "Independence"]);
  });

  it("returns no shifts when the month has no identityUpdates evidence at all", () => {
    const current = buildMonth();

    const result = computeMonthlyComparison(current, null);
    expect(result.traitsMorePresent).toEqual([]);
    expect(result.traitsLessPresent).toEqual([]);
  });
});

describe("computeMonthlyComparison — comparison against a previous month", () => {
  it("flags a trait as more present when it's newly appearing in identityUpdates", () => {
    const current = withIdentityUpdates(identityUpdate(["Courage"]));
    const previous = buildMonth();

    const result = computeMonthlyComparison(current, previous);
    expect(result.traitsMorePresent).toEqual(["Courage"]);
    expect(result.traitsLessPresent).toEqual([]);
  });

  it("flags a trait as less present when it no longer appears in identityUpdates", () => {
    const current = buildMonth();
    const previous = withIdentityUpdates(identityUpdate(["Independence"]));

    const result = computeMonthlyComparison(current, previous);
    expect(result.traitsMorePresent).toEqual([]);
    expect(result.traitsLessPresent).toEqual(["Independence"]);
  });

  it("does not surface a trait decrease when neither month has identityUpdates", () => {
    const current = buildMonth();
    const previous = buildMonth();

    const result = computeMonthlyComparison(current, previous);
    expect(result.traitsMorePresent).toEqual([]);
    expect(result.traitsLessPresent).toEqual([]);
  });

  it("flags a trait as more present when its frequency rank improves", () => {
    const current = withIdentityUpdates(
      identityUpdate(["Courage"]),
      identityUpdate(["Courage"]),
      identityUpdate(["Independence"]),
    );
    const previous = withIdentityUpdates(
      identityUpdate(["Independence"]),
      identityUpdate(["Independence"]),
      identityUpdate(["Courage"]),
    );

    const result = computeMonthlyComparison(current, previous);
    expect(result.traitsMorePresent).toEqual(["Courage"]);
    expect(result.traitsLessPresent).toEqual(["Independence"]);
  });

  it("caps traitsMorePresent and traitsLessPresent at 3 items each", () => {
    const current = withIdentityUpdates(
      identityUpdate(["Connection"]),
      identityUpdate(["Independence"]),
      identityUpdate(["Curiosity"]),
      identityUpdate(["Stability"]),
    );
    const previous = buildMonth();

    const result = computeMonthlyComparison(current, previous);
    expect(result.traitsMorePresent).toHaveLength(3);
    expect(result.traitsMorePresent).toEqual(["Connection", "Independence", "Curiosity"]);
  });
});
