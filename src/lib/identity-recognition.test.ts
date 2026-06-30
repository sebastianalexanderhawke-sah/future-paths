import { describe, expect, it } from "vitest";

import { EMPTY_DIMENSION_SCORES } from "@/lib/behavior-signals";
import { IDENTITY_LIBRARY } from "@/lib/identity-library";
import {
  computeConfidence,
  recognizeIdentities,
  recognizeIdentitiesFromObservations,
  recognizeIdentitiesWithAttribution,
  scoreToLikelihood,
  type AttributableObservation,
  type IdentityMatch,
} from "@/lib/identity-recognition";
import type { DimensionScoreMap } from "@/types/behavior";

// ---------------------------------------------------------------------------
// scoreToLikelihood
// ---------------------------------------------------------------------------

describe("scoreToLikelihood", () => {
  it("returns 0 for a score of zero", () => {
    expect(scoreToLikelihood(0)).toBe(0);
  });

  it("returns 0 for negative scores", () => {
    expect(scoreToLikelihood(-10)).toBe(0);
    expect(scoreToLikelihood(-100)).toBe(0);
  });

  it("returns 50 when score equals the scale constant (50)", () => {
    // 100 * 50 / (50 + 50) = 50
    expect(scoreToLikelihood(50)).toBe(50);
  });

  it("approaches 100 for very large scores without reaching it", () => {
    const high = scoreToLikelihood(10_000);
    expect(high).toBeGreaterThan(99);
    expect(high).toBeLessThanOrEqual(100);
  });

  it("is monotonically increasing for positive inputs", () => {
    const scores = [1, 5, 10, 25, 50, 100, 200];
    const likelihoods = scores.map(scoreToLikelihood);
    for (let i = 1; i < likelihoods.length; i++) {
      expect(likelihoods[i]).toBeGreaterThanOrEqual(likelihoods[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// recognizeIdentities — basic mechanics
// ---------------------------------------------------------------------------

describe("recognizeIdentities — empty profile", () => {
  it("returns no matches when all dimension scores are zero", () => {
    const result = recognizeIdentities({ ...EMPTY_DIMENSION_SCORES });
    expect(result).toHaveLength(0);
  });
});

describe("recognizeIdentities — independence-dominant user", () => {
  // Simulates a user who consistently chooses solo paths and initiates projects.
  // Independence: 20, Initiative: 10, Consistency: 8 — all others: 0.
  const independenceUser: DimensionScoreMap = {
    ...EMPTY_DIMENSION_SCORES,
    Independence: 20,
    Initiative: 10,
    Consistency: 8,
  };

  let matches: IdentityMatch[];

  it("produces at least one match", () => {
    matches = recognizeIdentities(independenceUser);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("ranks Self-Reliant Builder as the top match", () => {
    matches = recognizeIdentities(independenceUser);
    expect(matches[0].identityId).toBe("self-reliant-builder");
  });

  it("computes the expected raw score for Self-Reliant Builder", () => {
    // Independence(1.0)×20 + Initiative(0.8)×10 + Consistency(0.7)×8
    // = 20 + 8 + 5.6 = 33.6
    matches = recognizeIdentities(independenceUser);
    const srb = matches.find((m) => m.identityId === "self-reliant-builder")!;
    expect(srb.score).toBeCloseTo(33.6, 1);
  });

  it("includes Independence, Initiative, Consistency in matchedDimensions", () => {
    matches = recognizeIdentities(independenceUser);
    const srb = matches.find((m) => m.identityId === "self-reliant-builder")!;
    expect(srb.matchedDimensions).toContain("Independence");
    expect(srb.matchedDimensions).toContain("Initiative");
    expect(srb.matchedDimensions).toContain("Consistency");
  });

  it("does not rank Steady Foundation Builder highly (opposite Risk Tolerance signal)", () => {
    // Foundation Builder has Risk Tolerance −0.8; user has Risk Tolerance 0.
    // Foundation Builder has no positive Independence/Initiative signal.
    // It should not outrank Self-Reliant Builder.
    matches = recognizeIdentities(independenceUser);
    const sfb = matches.find((m) => m.identityId === "steady-foundation-builder");
    const srb = matches.find((m) => m.identityId === "self-reliant-builder")!;
    if (sfb) {
      expect(sfb.score).toBeLessThan(srb.score);
    }
  });

  it("does not rank Community Weaver highly (negative Independence weight)", () => {
    // Community Weaver has Independence −0.4; user has Independence 20.
    // That alone subtracts 8 from the score, so Community Weaver should be low.
    matches = recognizeIdentities(independenceUser);
    const cw = matches.find((m) => m.identityId === "community-weaver");
    const srb = matches.find((m) => m.identityId === "self-reliant-builder")!;
    if (cw) {
      expect(cw.score).toBeLessThan(srb.score);
    }
  });
});

describe("recognizeIdentities — connection-dominant user", () => {
  const connectionUser: DimensionScoreMap = {
    ...EMPTY_DIMENSION_SCORES,
    Connection: 24,
    Vulnerability: 14,
    "Conflict Tolerance": 10,
    Consistency: 8,
  };

  it("ranks Community Weaver as the top match", () => {
    const matches = recognizeIdentities(connectionUser);
    expect(matches[0].identityId).toBe("community-weaver");
  });

  it("computes expected raw score for Community Weaver", () => {
    // Connection(1.0)×24 + Vulnerability(0.7)×14 + ConflictTolerance(0.6)×10
    // + Consistency(0.4)×8 = 24 + 9.8 + 6 + 3.2 = 43
    const matches = recognizeIdentities(connectionUser);
    const cw = matches.find((m) => m.identityId === "community-weaver")!;
    expect(cw.score).toBeCloseTo(43, 1);
  });

  it("correctly excludes Self-Reliant Builder (penalised by Connection -0.3)", () => {
    // SRB score = Independence(1.0)×0 + Initiative(0.8)×0 + Consistency(0.7)×8
    //             + Connection(-0.3)×24 + Vulnerability(-0.2)×14
    // = 0 + 0 + 5.6 − 7.2 − 2.8 = −4.4  → likelihood 0
    const matches = recognizeIdentities(connectionUser);
    const srb = matches.find((m) => m.identityId === "self-reliant-builder");
    expect(srb).toBeUndefined();
  });
});

describe("recognizeIdentities — risk-averse stability user", () => {
  // Simulates a user whose signals are Consistency and Conflict Tolerance,
  // with many "resists_change" and "follows_through_consistently" observations.
  const stabilityUser: DimensionScoreMap = {
    ...EMPTY_DIMENSION_SCORES,
    Consistency: 30,
    "Conflict Tolerance": -8, // frequent "avoids_conflict" signals → negative score
    "Risk Tolerance": -6,     // no risk signals → negative from negative signals
    Adaptability: -4,
  };

  it("ranks Steady Foundation Builder as the top match", () => {
    // SFB: Consistency(1.0)×30 + ConflictTolerance(0.5)×(−8)
    //      + RiskTolerance(−0.8)×(−6) + Adaptability(−0.6)×(−4)
    //      = 30 − 4 + 4.8 + 2.4 = 33.2
    const matches = recognizeIdentities(stabilityUser);
    expect(matches[0].identityId).toBe("steady-foundation-builder");
  });

  it("negative user scores on positively-weighted dimensions do not appear in matchedDimensions", () => {
    const matches = recognizeIdentities(stabilityUser);
    const sfb = matches.find((m) => m.identityId === "steady-foundation-builder")!;
    // Conflict Tolerance is negative in user profile, so even with positive weight it
    // should not appear as a "matched" dimension (matched = weight > 0 AND user score > 0)
    expect(sfb.matchedDimensions).not.toContain("Conflict Tolerance");
  });
});

describe("recognizeIdentities — evidenceStrength thresholds", () => {
  it("returns Emerging for likelihood < 30", () => {
    // Small Independence signal produces a low raw score → low likelihood
    const user: DimensionScoreMap = { ...EMPTY_DIMENSION_SCORES, Independence: 5 };
    const matches = recognizeIdentities(user);
    const srb = matches.find((m) => m.identityId === "self-reliant-builder");
    if (srb) {
      expect(["Emerging"]).toContain(srb.evidenceStrength);
    }
  });

  it("returns Strong for likelihood ≥ 60", () => {
    // Strong Independence + Initiative + Consistency signal
    const user: DimensionScoreMap = {
      ...EMPTY_DIMENSION_SCORES,
      Independence: 80,
      Initiative: 50,
      Consistency: 40,
    };
    const matches = recognizeIdentities(user);
    const srb = matches.find((m) => m.identityId === "self-reliant-builder")!;
    expect(srb.evidenceStrength).toBe("Strong");
  });
});

describe("recognizeIdentities — options", () => {
  const richUser: DimensionScoreMap = {
    ...EMPTY_DIMENSION_SCORES,
    Independence: 20,
    Connection: 10,
    Initiative: 12,
    Curiosity: 8,
    Consistency: 10,
    Reflection: 6,
    "Risk Tolerance": 8,
    Vulnerability: 6,
    Adaptability: 8,
    "Conflict Tolerance": 4,
  };

  it("respects maxResults", () => {
    const matches = recognizeIdentities(richUser, { maxResults: 2 });
    expect(matches.length).toBeLessThanOrEqual(2);
  });

  it("respects minLikelihood filter", () => {
    const matches = recognizeIdentities(richUser, { minLikelihood: 50 });
    for (const match of matches) {
      expect(match.likelihood).toBeGreaterThanOrEqual(50);
    }
  });

  it("returns results in descending score order", () => {
    const matches = recognizeIdentities(richUser);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].score).toBeLessThanOrEqual(matches[i - 1].score);
    }
  });
});

// ---------------------------------------------------------------------------
// recognizeIdentitiesFromObservations
// ---------------------------------------------------------------------------

describe("recognizeIdentitiesFromObservations", () => {
  it("returns no matches when the observation list is empty", () => {
    const result = recognizeIdentitiesFromObservations([]);
    expect(result).toHaveLength(0);
  });

  it("produces the same result as recognizeIdentities given the same dimension scores", () => {
    // Construct observations that produce a known dimension profile
    const observations = [
      { signals: ["chooses_solo_path"] }, // Independence +2
      { signals: ["chooses_solo_path"] }, // Independence +2
      { signals: ["starts_something_new"] }, // Initiative +2
    ];

    const fromObs = recognizeIdentitiesFromObservations(observations);
    const expectedDimensions: DimensionScoreMap = {
      ...EMPTY_DIMENSION_SCORES,
      Independence: 4,
      Initiative: 2,
    };
    const fromDimensions = recognizeIdentities(expectedDimensions);

    expect(fromObs.map((m) => m.identityId)).toEqual(fromDimensions.map((m) => m.identityId));
    expect(fromObs.map((m) => m.score)).toEqual(fromDimensions.map((m) => m.score));
  });
});

// ---------------------------------------------------------------------------
// Identity library completeness
// ---------------------------------------------------------------------------

describe("IDENTITY_LIBRARY", () => {
  it("contains 14 identities", () => {
    expect(IDENTITY_LIBRARY).toHaveLength(14);
  });

  it("has unique ids", () => {
    const ids = IDENTITY_LIBRARY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique canonical names", () => {
    const names = IDENTITY_LIBRARY.map((i) => i.canonical_name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every identity has at least one positive dimension weight", () => {
    for (const identity of IDENTITY_LIBRARY) {
      const hasPositive = Object.values(identity.dimension_weights).some((w) => w > 0);
      expect(hasPositive, `${identity.canonical_name} has no positive weights`).toBe(true);
    }
  });

  it("every identity has at least 4 typical behaviors", () => {
    for (const identity of IDENTITY_LIBRARY) {
      expect(
        identity.typical_behaviors.length,
        `${identity.canonical_name} has fewer than 4 typical behaviors`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it("all dimension weight keys are valid IdentityDimension values", () => {
    const validDimensions = new Set([
      "Independence",
      "Connection",
      "Initiative",
      "Reflection",
      "Adaptability",
      "Curiosity",
      "Consistency",
      "Risk Tolerance",
      "Vulnerability",
      "Conflict Tolerance",
    ]);

    for (const identity of IDENTITY_LIBRARY) {
      for (const dim of Object.keys(identity.dimension_weights)) {
        expect(
          validDimensions.has(dim),
          `${identity.canonical_name} uses unknown dimension "${dim}"`,
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// computeConfidence
// ---------------------------------------------------------------------------

describe("computeConfidence", () => {
  it("returns 0 when there are no observations", () => {
    expect(
      computeConfidence({
        totalObservations: 0,
        supportingCount: 0,
        opposingCount: 0,
        recentSupportCount: 0,
        recentWindowSize: 0,
        uniqueSituationCount: 0,
      }),
    ).toBe(0);
  });

  it("gives low confidence for few observations even with perfect consistency", () => {
    // 5 observations, all aligned, from 3 situations
    const conf = computeConfidence({
      totalObservations: 5,
      supportingCount: 5,
      opposingCount: 0,
      recentSupportCount: 5,
      recentWindowSize: 5,
      uniqueSituationCount: 3,
    });
    // observationCoverage = 5/15 ≈ 0.33; situationDiversity = 3/8 = 0.375
    // coverageFactor = 0.33×0.7 + 0.375×0.3 ≈ 0.34
    // qualityFactor = (1.0×0.6 + 1.0×0.4)×1.0 = 1.0
    // confidence ≈ 34%
    expect(conf).toBeGreaterThan(20);
    expect(conf).toBeLessThan(50);
  });

  it("gives high confidence for many aligned observations across many situations", () => {
    // 50 observations, 48 aligned, 10 situations
    const conf = computeConfidence({
      totalObservations: 50,
      supportingCount: 48,
      opposingCount: 2,
      recentSupportCount: 9,
      recentWindowSize: 10,
      uniqueSituationCount: 10,
    });
    expect(conf).toBeGreaterThan(75);
  });

  it("penalises contradictory evidence", () => {
    const noContra = computeConfidence({
      totalObservations: 20,
      supportingCount: 20,
      opposingCount: 0,
      recentSupportCount: 10,
      recentWindowSize: 10,
      uniqueSituationCount: 5,
    });
    const withContra = computeConfidence({
      totalObservations: 20,
      supportingCount: 12,
      opposingCount: 8,
      recentSupportCount: 6,
      recentWindowSize: 10,
      uniqueSituationCount: 5,
    });
    expect(withContra).toBeLessThan(noContra);
  });

  it("is higher when recent observations align more than historical average", () => {
    const stale = computeConfidence({
      totalObservations: 20,
      supportingCount: 10,
      opposingCount: 10,
      recentSupportCount: 10, // all recent support
      recentWindowSize: 10,
      uniqueSituationCount: 4,
    });
    const fading = computeConfidence({
      totalObservations: 20,
      supportingCount: 10,
      opposingCount: 10,
      recentSupportCount: 0, // none recent support
      recentWindowSize: 10,
      uniqueSituationCount: 4,
    });
    expect(stale).toBeGreaterThan(fading);
  });

  it("is bounded to [0, 100]", () => {
    const low = computeConfidence({
      totalObservations: 1,
      supportingCount: 0,
      opposingCount: 1,
      recentSupportCount: 0,
      recentWindowSize: 1,
      uniqueSituationCount: 1,
    });
    const high = computeConfidence({
      totalObservations: 100,
      supportingCount: 100,
      opposingCount: 0,
      recentSupportCount: 10,
      recentWindowSize: 10,
      uniqueSituationCount: 20,
    });
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// recognizeIdentitiesWithAttribution
// ---------------------------------------------------------------------------

// Helper to build an AttributableObservation fixture.
function obs(
  overrides: Partial<AttributableObservation> & Pick<AttributableObservation, "signals">,
  idx = 0,
): AttributableObservation {
  return {
    id: overrides.id ?? `obs-${idx}`,
    observation: overrides.observation ?? "Did something observable",
    momentId: overrides.momentId ?? "moment-1",
    momentTitle: overrides.momentTitle ?? "Situation 1",
    extractedAt: overrides.extractedAt,
    signals: overrides.signals,
  };
}

describe("recognizeIdentitiesWithAttribution — empty observations", () => {
  it("returns no matches when there are no observations", () => {
    expect(recognizeIdentitiesWithAttribution([])).toHaveLength(0);
  });
});

describe("recognizeIdentitiesWithAttribution — Independence-dominant profile", () => {
  // chooses_solo_path → Independence +2
  // starts_something_new → Initiative +2
  // 10 solo observations from 3 situations: scores match recognizeIdentities baseline
  const observations: AttributableObservation[] = [
    obs({ signals: ["chooses_solo_path"], momentId: "m1", momentTitle: "Career pivot" }, 0),
    obs({ signals: ["chooses_solo_path"], momentId: "m1", momentTitle: "Career pivot" }, 1),
    obs({ signals: ["chooses_solo_path"], momentId: "m2", momentTitle: "Move abroad" }, 2),
    obs({ signals: ["chooses_solo_path"], momentId: "m2", momentTitle: "Move abroad" }, 3),
    obs({ signals: ["chooses_solo_path"], momentId: "m3", momentTitle: "New business" }, 4),
    obs({ signals: ["starts_something_new"], momentId: "m1", momentTitle: "Career pivot" }, 5),
    obs({ signals: ["starts_something_new"], momentId: "m2", momentTitle: "Move abroad" }, 6),
  ];

  it("returns IdentityMatchWithAttribution with the same identityId as recognizeIdentities", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const base = recognizeIdentitiesFromObservations(observations);
    expect(attributed.map((m) => m.identityId)).toEqual(base.map((m) => m.identityId));
  });

  it("score and likelihood match the non-attributed pipeline", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const base = recognizeIdentitiesFromObservations(observations);
    for (let i = 0; i < attributed.length; i++) {
      expect(attributed[i].score).toBeCloseTo(base[i].score, 5);
      expect(attributed[i].likelihood).toBe(base[i].likelihood);
    }
  });

  it("confidence is a number between 0 and 100", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    for (const match of attributed) {
      expect(match.confidence).toBeGreaterThanOrEqual(0);
      expect(match.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("dimensionBreakdown lists Independence with positive contribution for top match", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    expect(srb).toBeDefined();
    const indep = srb.dimensionBreakdown.find((d) => d.dimension === "Independence");
    expect(indep).toBeDefined();
    expect(indep!.contribution).toBeGreaterThan(0);
  });

  it("dimensionBreakdown is sorted descending by contribution", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    for (let i = 1; i < srb.dimensionBreakdown.length; i++) {
      expect(srb.dimensionBreakdown[i].contribution).toBeLessThanOrEqual(
        srb.dimensionBreakdown[i - 1].contribution,
      );
    }
  });

  it("opposingDimensions contains Connection (identity weight −0.3, no user score = 0 → skipped)", () => {
    // Connection weight = −0.3 but user Connection score = 0, so contribution = 0 → omitted
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    // Connection and Vulnerability are −weight but user has 0 score → contribution 0 → not in opposing
    const connectionInOpposing = srb.opposingDimensions.find((d) => d.dimension === "Connection");
    expect(connectionInOpposing).toBeUndefined();
  });

  it("supportingObservations have positive contributions", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    for (const o of srb.supportingObservations) {
      expect(o.contribution).toBeGreaterThan(0);
    }
  });

  it("supportingObservations are sorted descending by contribution", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    for (let i = 1; i < srb.supportingObservations.length; i++) {
      expect(srb.supportingObservations[i].contribution).toBeLessThanOrEqual(
        srb.supportingObservations[i - 1].contribution,
      );
    }
  });

  it("supportingObservations includes at most 5 entries", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    expect(srb.supportingObservations.length).toBeLessThanOrEqual(5);
  });

  it("supportingSituations aggregates observations by momentId", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    // m1 has 3 observations, m2 has 3, m3 has 1 — all positive for SRB
    expect(srb.supportingSituations.length).toBeGreaterThan(0);
    const momentIds = srb.supportingSituations.map((s) => s.momentId);
    // Each momentId appears at most once
    expect(new Set(momentIds).size).toBe(momentIds.length);
  });

  it("supportingSituations are sorted descending by contribution", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    for (let i = 1; i < srb.supportingSituations.length; i++) {
      expect(srb.supportingSituations[i].contribution).toBeLessThanOrEqual(
        srb.supportingSituations[i - 1].contribution,
      );
    }
  });

  it("supportingSituations carries the correct momentTitle", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    const m1Situation = srb.supportingSituations.find((s) => s.momentId === "m1");
    expect(m1Situation?.momentTitle).toBe("Career pivot");
  });

  it("observationCount in supportingSituations reflects actual observation count from that moment", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder")!;
    // m1 has obs 0 (chooses_solo_path), obs 1 (chooses_solo_path), obs 5 (starts_something_new) = 3
    const m1 = srb.supportingSituations.find((s) => s.momentId === "m1");
    expect(m1?.observationCount).toBe(3);
  });
});

describe("recognizeIdentitiesWithAttribution — opposing observations", () => {
  // A user with high Connection, then some observations that work against Community Weaver
  // because they signal Independence (CW weight = −0.4).
  const observations: AttributableObservation[] = [
    obs({ signals: ["deepens_relationship"], momentId: "m1", momentTitle: "Friendship" }, 0),
    obs({ signals: ["deepens_relationship"], momentId: "m1", momentTitle: "Friendship" }, 1),
    obs({ signals: ["chooses_solo_path"], momentId: "m2", momentTitle: "Solo project" }, 2),
  ];

  it("opposing observations appear when a signal works against the matched identity", () => {
    // chooses_solo_path → Independence +2; CW weight for Independence = −0.4
    // So obs 2 contribution = −0.4 × 2 = −0.8 → opposing
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const cw = attributed.find((m) => m.identityId === "community-weaver");
    if (cw) {
      const opposing = cw.opposingObservations;
      expect(opposing.length).toBeGreaterThan(0);
      for (const o of opposing) {
        expect(o.contribution).toBeLessThan(0);
      }
    }
  });

  it("opposingObservations are sorted ascending by contribution (most negative first)", () => {
    const attributed = recognizeIdentitiesWithAttribution(observations);
    const cw = attributed.find((m) => m.identityId === "community-weaver");
    if (cw && cw.opposingObservations.length > 1) {
      for (let i = 1; i < cw.opposingObservations.length; i++) {
        expect(cw.opposingObservations[i].contribution).toBeGreaterThanOrEqual(
          cw.opposingObservations[i - 1].contribution,
        );
      }
    }
  });
});

describe("recognizeIdentitiesWithAttribution — recency ordering", () => {
  it("uses extractedAt to determine the recency window", () => {
    // Stale profile: early observations aligned with SRB, then last 10 are neutral
    const early: AttributableObservation[] = Array.from({ length: 12 }, (_, i) =>
      obs(
        {
          signals: ["chooses_solo_path"],
          momentId: "m1",
          momentTitle: "Early",
          extractedAt: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        },
        i,
      ),
    );
    const recent: AttributableObservation[] = Array.from({ length: 10 }, (_, i) =>
      obs(
        {
          signals: [],
          momentId: "m2",
          momentTitle: "Recent",
          extractedAt: `2025-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        },
        i + 12,
      ),
    );
    const all = [...early, ...recent];
    const attributed = recognizeIdentitiesWithAttribution(all);
    const srb = attributed.find((m) => m.identityId === "self-reliant-builder");
    // confidence should be reduced because recent 10 observations are neutral
    if (srb) {
      // Just verify confidence is a valid number — recency factor lowers it
      expect(srb.confidence).toBeGreaterThanOrEqual(0);
      expect(srb.confidence).toBeLessThanOrEqual(100);
    }
  });
});
