import { describe, expect, it } from "vitest";

import { buildIdentityBrief } from "@/lib/identity-brief";
import type { LedgerObservation } from "@/lib/behavior-ledger";
import { buildDecisionMakerSnapshot } from "@/lib/decision-maker-snapshot";

function observation(
  id: string,
  signals: string[],
  daysAgo: number,
  momentId = `moment-${id}`,
): LedgerObservation {
  return {
    id,
    momentId,
    observation: `Observation ${id}`,
    signals,
    sourceType: "path_choice",
    extractedAt: new Date(Date.UTC(2026, 5, 30) - daysAgo * 86_400_000).toISOString(),
  };
}

// Enough ledger history to clear the snapshot's evidence floor, with a
// lopsided solo-vs-collaboration tension.
const RICH_LEDGER: LedgerObservation[] = [
  observation("1", ["chooses_solo_path", "sets_own_terms"], 5),
  observation("2", ["chooses_solo_path"], 12),
  observation("3", ["chooses_solo_path", "takes_uncertain_risk"], 20),
  observation("4", ["sets_own_terms"], 30),
  observation("5", ["takes_uncertain_risk"], 45),
  observation("6", ["chooses_solo_path"], 60),
  observation("7", ["follows_through_consistently"], 70),
  observation("8", ["seeks_collaboration"], 80),
];

describe("buildDecisionMakerSnapshot", () => {
  it("returns null when the ledger is too thin to mean anything", () => {
    const brief = buildIdentityBrief(RICH_LEDGER.slice(0, 2));
    expect(buildDecisionMakerSnapshot(brief)).toBeNull();
  });

  it("projects the brief down to structured, prose-free decision context", () => {
    const brief = buildIdentityBrief(RICH_LEDGER);
    const snapshot = buildDecisionMakerSnapshot(brief);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.stability).toBe(brief.stability.band);

    expect(snapshot!.strongestPatterns.length).toBeGreaterThan(0);
    expect(snapshot!.strongestPatterns.length).toBeLessThanOrEqual(6);
    expect(snapshot!.strongestPatterns[0]!.pattern).toBe("chooses_solo_path");

    // No free text anywhere: every value is a slug, enum, name, or nested
    // structure of those — never observation prose.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("Observation ");
  });

  it("reports the dominant side of a lopsided tradeoff", () => {
    const brief = buildIdentityBrief(RICH_LEDGER);
    const snapshot = buildDecisionMakerSnapshot(brief);

    const soloTradeoff = snapshot!.recurringTradeoffs.find(
      (tradeoff) => tradeoff.leansToward === "chooses_solo_path",
    );
    expect(soloTradeoff).toBeDefined();
    expect(soloTradeoff!.awayFrom).toBe("seeks_collaboration");
  });

  it("caps top directions at three", () => {
    const brief = buildIdentityBrief(RICH_LEDGER);
    const snapshot = buildDecisionMakerSnapshot(brief);

    expect(snapshot!.topDirections.length).toBeLessThanOrEqual(3);
    for (const direction of snapshot!.topDirections) {
      expect(typeof direction.name).toBe("string");
      expect(direction.name.length).toBeGreaterThan(0);
    }
  });
});
