import { describe, expect, it } from "vitest";

import { serializeContext } from "@/lib/ai/context/truncate";
import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";
import type { ThemeName } from "@/types/enums";

describe("serializeContext — mostRecentChosenPath", () => {
  const mostRecentChosenPath = {
    description: "Take the new job",
    themes: ["Stability"] as IdentityContextBundle["mostRecentChosenPath"]["themes"],
    chosen_at: "2026-06-23T16:27:12.813Z",
    future_shift: "Builds toward financial stability",
  };

  it("truncates the description but keeps the field", () => {
    const bundle: IdentityContextBundle = {
      userId: "user-1",
      profile: "future_self",
      mostRecentChosenPath: { ...mostRecentChosenPath, description: "x".repeat(1000) },
    };

    const parsed = JSON.parse(serializeContext(bundle));

    expect(parsed.mostRecentChosenPath.description.length).toBeLessThan(1000);
    expect(parsed.mostRecentChosenPath.chosen_at).toBe(mostRecentChosenPath.chosen_at);
    expect(parsed.mostRecentChosenPath.themes).toEqual(["Stability"]);
  });

  it("survives total-JSON-limit reduction when the rest of the context is huge", () => {
    // Bloat the bundle well past CONTEXT_LIMITS.TOTAL_JSON_CHARS with content
    // unrelated to the chosen path, to force both fallback reduction paths.
    const bundle: IdentityContextBundle = {
      userId: "user-1",
      profile: "future_self",
      mostRecentChosenPath,
      checkIns: Array.from({ length: 200 }, () => ({
        theme_changes: [],
        identity_impact: "x".repeat(500),
        reality_summary: "x".repeat(500),
      })),
      identityUpdates: Array.from({ length: 200 }, () => ({
        title: "x".repeat(200),
        summary: "x".repeat(500),
        themes: [],
      })),
    };

    const parsed = JSON.parse(serializeContext(bundle));

    expect(parsed.mostRecentChosenPath).toBeDefined();
    expect(parsed.mostRecentChosenPath.chosen_at).toBe(mostRecentChosenPath.chosen_at);
    expect(parsed.mostRecentChosenPath.future_shift).toBe(mostRecentChosenPath.future_shift);
  });
});

describe("serializeContext — monthlyIdentityEvolution", () => {
  function buildMonth(evidenceCount: number): MonthlyIdentityEvolution {
    const themes: ThemeName[] = ["Courage"];

    return {
      month: "June 2026",
      dominantThemes: ["Courage", "Independence"],
      majorDecisions: ["Apply Wider, Move Faster"],
      futureShifts: [{ futureName: "Trades comfort for courage", delta: 36 }],
      identityChangeEvidence: {
        dominantThemes: ["Courage", "Independence"],
        futureShifts: [{ futureName: "Trades comfort for courage", delta: 36 }],
        identityUpdates: Array.from({ length: evidenceCount }, (_, i) => ({
          id: `update-${i}`,
          title: "x".repeat(80),
          summary: "x".repeat(400),
          themes,
          updateType: "reality_shift",
          createdAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
        })),
        chosenPaths: Array.from({ length: evidenceCount }, (_, i) => ({
          id: `path-${i}`,
          title: "x".repeat(80),
          themes,
          chosenAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
        })),
        checkIns: Array.from({ length: evidenceCount }, (_, i) => ({
          id: `check-in-${i}`,
          reflection: "x".repeat(80),
          realitySummary: "x".repeat(80),
          identityImpact: "x".repeat(80),
          themeChanges: [],
          createdAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
        })),
      },
    };
  }

  it("survives total-JSON-limit reduction by trimming evidence to the newest 10, keeping month/themes/decisions/shifts", () => {
    const bundle: IdentityContextBundle = {
      userId: "user-1",
      profile: "monthly_identity_narrative",
      monthlyIdentityEvolution: [buildMonth(74)],
    };

    const parsed = JSON.parse(serializeContext(bundle));

    expect(parsed.monthlyIdentityEvolution).toBeDefined();
    expect(parsed.monthlyIdentityEvolution).toHaveLength(1);

    const month = parsed.monthlyIdentityEvolution[0];
    expect(month.month).toBe("June 2026");
    expect(month.dominantThemes).toEqual(["Courage", "Independence"]);
    expect(month.majorDecisions).toEqual(["Apply Wider, Move Faster"]);
    expect(month.futureShifts).toEqual([{ futureName: "Trades comfort for courage", delta: 36 }]);
    expect(month.identityChangeEvidence.identityUpdates).toHaveLength(10);
    expect(month.identityChangeEvidence.chosenPaths).toHaveLength(10);
    expect(month.identityChangeEvidence.checkIns).toHaveLength(10);
  });
});
