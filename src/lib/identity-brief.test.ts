import { describe, expect, it } from "vitest";

import type { LedgerObservation } from "@/lib/behavior-ledger";
import { ALL_DIMENSIONS, SIGNAL_SLUGS } from "@/lib/behavior-signals";
import {
  BEHAVIOR_ENGINE_VERSION,
  buildIdentityBrief,
  classifySignalTrend,
  EVIDENCE_BUDGET,
  profileMaturity,
  SIGNAL_RELATION_PAIRS,
  TOP_SIGNAL_LIMIT,
  type IdentityBrief,
} from "@/lib/identity-brief";
import { IDENTITY_LIBRARY } from "@/lib/identity-library";
import {
  recognizeIdentitiesFromObservations,
  recognizeIdentitiesWithAttribution,
} from "@/lib/identity-recognition";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NEWEST = "2026-01-01T00:00:00.000Z";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBeforeNewest(days: number): string {
  return new Date(Date.parse(NEWEST) - days * MS_PER_DAY).toISOString();
}

let nextId = 0;

function makeObs(overrides: Partial<LedgerObservation> = {}): LedgerObservation {
  nextId += 1;
  return {
    id: `obs-${String(nextId).padStart(4, "0")}`,
    observation: "Started a side project without being asked.",
    signals: ["starts_something_new"],
    momentId: "moment-1",
    sourceType: "situation_complete",
    extractedAt: NEWEST,
    ...overrides,
  };
}

/**
 * A small mixed corpus exercising every trend:
 * - chooses_solo_path: strengthened (2 recent vs 1 previous), 3 situations
 * - asks_for_help: stable (1 recent, 1 previous)
 * - journals_or_reflects: dormant (older history only)
 * - starts_something_new: emerged (first activity at the anchor)
 */
function briefCorpus(): LedgerObservation[] {
  // Explicit ids so repeated calls build byte-identical ledgers (the shared
  // nextId counter would otherwise mint different ids per call).
  return [
    makeObs({ id: "solo-1", signals: ["chooses_solo_path"], momentId: "m1", extractedAt: daysBeforeNewest(10) }),
    makeObs({ id: "solo-2", signals: ["chooses_solo_path"], momentId: "m2", extractedAt: daysBeforeNewest(5) }),
    makeObs({ id: "solo-3", signals: ["chooses_solo_path"], momentId: "m3", extractedAt: daysBeforeNewest(120) }),
    makeObs({ id: "help-1", signals: ["asks_for_help"], momentId: "m1", extractedAt: daysBeforeNewest(100) }),
    makeObs({ id: "help-2", signals: ["asks_for_help"], momentId: "m4", extractedAt: daysBeforeNewest(20) }),
    makeObs({ id: "journal-1", signals: ["journals_or_reflects"], momentId: "m2", extractedAt: daysBeforeNewest(400) }),
    makeObs({ id: "start-1", signals: ["starts_something_new"], momentId: "m4", extractedAt: NEWEST }),
  ];
}

function signalIn(brief: IdentityBrief, slug: string) {
  return brief.topSignals.find((s) => s.signal === slug);
}

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — determinism", () => {
  it("produces identical briefs from identical ledgers", () => {
    const a = buildIdentityBrief(briefCorpus());
    const b = buildIdentityBrief(briefCorpus());

    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("is independent of observation order", () => {
    const corpus = briefCorpus();
    const forward = buildIdentityBrief(corpus);
    const reversed = buildIdentityBrief([...corpus].reverse());

    expect(reversed).toEqual(forward);
  });

  it("anchors generatedAt to the newest observation, never the wall clock", () => {
    const brief = buildIdentityBrief(briefCorpus());
    expect(brief.generatedAt).toBe(NEWEST);
  });

  it("stamps the behavior engine version", () => {
    expect(buildIdentityBrief([]).behaviorEngineVersion).toBe(BEHAVIOR_ENGINE_VERSION);
  });

  it("builds an empty brief from an empty ledger", () => {
    const brief = buildIdentityBrief([]);

    expect(brief.generatedAt).toBeNull();
    expect(brief.topSignals).toEqual([]);
    expect(brief.signalRelations).toEqual([]);
    expect(brief.recentChanges).toEqual({
      emerged: [],
      strengthened: [],
      weakened: [],
      dormant: [],
      returned: [],
    });
    expect(brief.stability.band).toBe("forming");
    expect(brief.summary.totalObservations).toBe(0);
    expect(brief.summary.strongestSignal).toBeNull();
    expect(brief.summary.newestSignal).toBeNull();
    expect(brief.rankedFutures).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Locality: small changes only affect relevant fields
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — locality of changes", () => {
  // Six observations, so adding one keeps the profile below the weak→growing
  // maturity threshold (8) — otherwise the evidence budget would change by
  // design and mask what this suite pins. The added observation shares the
  // anchor timestamp, so the decay reference is unchanged and unrelated
  // signals must be byte-identical.
  function localityCorpus(): LedgerObservation[] {
    return [
      makeObs({ id: "solo-1", signals: ["chooses_solo_path"], momentId: "m1", extractedAt: daysBeforeNewest(10) }),
      makeObs({ id: "solo-2", signals: ["chooses_solo_path"], momentId: "m2", extractedAt: daysBeforeNewest(5) }),
      makeObs({ id: "help-1", signals: ["asks_for_help"], momentId: "m1", extractedAt: daysBeforeNewest(100) }),
      makeObs({ id: "help-2", signals: ["asks_for_help"], momentId: "m4", extractedAt: daysBeforeNewest(20) }),
      makeObs({ id: "journal-1", signals: ["journals_or_reflects"], momentId: "m2", extractedAt: daysBeforeNewest(400) }),
      makeObs({ id: "start-1", signals: ["starts_something_new"], momentId: "m4", extractedAt: NEWEST }),
    ];
  }

  const before = buildIdentityBrief(localityCorpus());
  const after = buildIdentityBrief([
    ...localityCorpus(),
    makeObs({
      id: "obs-added",
      signals: ["seeks_collaboration"],
      momentId: "m5",
      extractedAt: NEWEST,
    }),
  ]);

  it("leaves unrelated signal states untouched", () => {
    for (const slug of ["asks_for_help", "journals_or_reflects", "starts_something_new", "chooses_solo_path"]) {
      expect(signalIn(after, slug)).toEqual(signalIn(before, slug));
    }
  });

  it("adds the new signal without disturbing other trend groups", () => {
    expect(after.recentChanges.emerged).toContain("seeks_collaboration");
    expect(after.recentChanges.strengthened).toEqual(before.recentChanges.strengthened);
    expect(after.recentChanges.weakened).toEqual(before.recentChanges.weakened);
    expect(after.recentChanges.dormant).toEqual(before.recentChanges.dormant);
    expect(after.recentChanges.returned).toEqual(before.recentChanges.returned);
  });

  it("only changes relations that involve the new signal", () => {
    const unrelatedBefore = before.signalRelations.filter(
      (r) => !r.signals.includes("seeks_collaboration"),
    );
    const unrelatedAfter = after.signalRelations.filter(
      (r) => !r.signals.includes("seeks_collaboration"),
    );
    expect(unrelatedAfter).toEqual(unrelatedBefore);

    // The solo↔collaboration tension now has an opposing side.
    const relation = after.signalRelations.find(
      (r) => r.signals[0] === "chooses_solo_path" && r.signals[1] === "seeks_collaboration",
    );
    expect(relation?.dominant).toBe("chooses_solo_path");
    expect(relation?.opposingStrength).toBeGreaterThan(0);
  });

  it("keeps representative evidence selection stable under unrelated additions", () => {
    expect(signalIn(after, "chooses_solo_path")!.representativeEvidence).toEqual(
      signalIn(before, "chooses_solo_path")!.representativeEvidence,
    );
  });
});

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — deterministic ordering", () => {
  it("orders top signals by evidence strength descending", () => {
    const brief = buildIdentityBrief(briefCorpus());
    const strengths = brief.topSignals.map((s) => s.evidenceStrength);

    for (let i = 1; i < strengths.length; i++) {
      expect(strengths[i]).toBeLessThanOrEqual(strengths[i - 1]);
    }
    expect(brief.topSignals[0].signal).toBe("chooses_solo_path");
  });

  it("caps top signals at the limit", () => {
    // One observation for every known signal — far more than the limit.
    const corpus = SIGNAL_SLUGS.map((slug, i) =>
      makeObs({ signals: [slug], momentId: `m${i}`, extractedAt: NEWEST }),
    );
    expect(buildIdentityBrief(corpus).topSignals).toHaveLength(TOP_SIGNAL_LIMIT);
  });

  it("lists relations in the fixed pair-table order", () => {
    const corpus = [
      makeObs({ signals: ["defers_to_others"] }),
      makeObs({ signals: ["avoids_conflict"] }),
      makeObs({ signals: ["chooses_solo_path"] }),
    ];
    const relations = buildIdentityBrief(corpus).signalRelations;
    const pairIndex = (signals: readonly [string, string]) =>
      SIGNAL_RELATION_PAIRS.findIndex(([a, b]) => a === signals[0] && b === signals[1]);

    const indices = relations.map((r) => pairIndex(r.signals));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("sorts recent-change groups alphabetically", () => {
    const corpus = [
      makeObs({ signals: ["starts_something_new"], extractedAt: NEWEST }),
      makeObs({ signals: ["asks_for_help"], extractedAt: NEWEST }),
      makeObs({ signals: ["explores_new_topic"], extractedAt: NEWEST }),
    ];
    const { emerged } = buildIdentityBrief(corpus).recentChanges;
    expect(emerged).toEqual([...emerged].sort());
    expect(emerged).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Trend classification
// ---------------------------------------------------------------------------

describe("classifySignalTrend", () => {
  it("classifies every trend", () => {
    expect(classifySignalTrend({ recentCount: 0, previousCount: 2, olderCount: 3 })).toBe("dormant");
    expect(classifySignalTrend({ recentCount: 1, previousCount: 0, olderCount: 0 })).toBe("emerged");
    expect(classifySignalTrend({ recentCount: 1, previousCount: 0, olderCount: 2 })).toBe("returned");
    expect(classifySignalTrend({ recentCount: 3, previousCount: 1, olderCount: 0 })).toBe("strengthened");
    expect(classifySignalTrend({ recentCount: 1, previousCount: 2, olderCount: 0 })).toBe("weakened");
    expect(classifySignalTrend({ recentCount: 2, previousCount: 2, olderCount: 5 })).toBe("stable");
  });
});

describe("buildIdentityBrief — trends from real ledgers", () => {
  it("derives each trend from occurrence timing", () => {
    const brief = buildIdentityBrief(briefCorpus());

    expect(signalIn(brief, "chooses_solo_path")?.trend).toBe("strengthened");
    expect(signalIn(brief, "asks_for_help")?.trend).toBe("stable");
    expect(signalIn(brief, "journals_or_reflects")?.trend).toBe("dormant");
    expect(signalIn(brief, "starts_something_new")?.trend).toBe("emerged");
  });

  it("classifies a comeback after a quiet previous window as returned", () => {
    const corpus = [
      makeObs({ signals: ["takes_uncertain_risk"], extractedAt: daysBeforeNewest(400) }),
      makeObs({ signals: ["takes_uncertain_risk"], extractedAt: daysBeforeNewest(300) }),
      makeObs({ signals: ["takes_uncertain_risk"], extractedAt: daysBeforeNewest(10) }),
      // Anchor so the reference time is NEWEST.
      makeObs({ signals: ["journals_or_reflects"], extractedAt: NEWEST }),
    ];

    const brief = buildIdentityBrief(corpus);
    expect(signalIn(brief, "takes_uncertain_risk")?.trend).toBe("returned");
    expect(brief.recentChanges.returned).toEqual(["takes_uncertain_risk"]);
  });
});

// ---------------------------------------------------------------------------
// Signal relations
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — signal relations", () => {
  it("reports the dominant side, the opposing side, and lopsidedness-based confidence", () => {
    const corpus = [
      makeObs({ signals: ["chooses_solo_path"], momentId: "m1" }),
      makeObs({ signals: ["chooses_solo_path"], momentId: "m2" }),
      makeObs({ signals: ["seeks_collaboration"], momentId: "m3" }),
    ];

    const relation = buildIdentityBrief(corpus).signalRelations[0];
    expect(relation.signals).toEqual(["chooses_solo_path", "seeks_collaboration"]);
    expect(relation.dominant).toBe("chooses_solo_path");
    expect(relation.opposing).toBe("seeks_collaboration");
    expect(relation.dominantStrength).toBe(2);
    expect(relation.opposingStrength).toBe(1);
    // lopsidedness (2/3 − 0.5)·2 = 1/3, volume min(1, 3/6) = 0.5 → 1/6
    expect(relation.confidence).toBeCloseTo(1 / 6, 10);
  });

  it("reports no dominant side for a balanced tension", () => {
    const corpus = [
      makeObs({ signals: ["avoids_conflict"] }),
      makeObs({ signals: ["engages_conflict_directly"] }),
    ];

    const relation = buildIdentityBrief(corpus).signalRelations[0];
    expect(relation.dominant).toBeNull();
    expect(relation.opposing).toBeNull();
    expect(relation.confidence).toBe(0);
    expect(relation.evidence).toEqual([]);
  });

  it("omits tensions with no evidence on either side", () => {
    const corpus = [makeObs({ signals: ["journals_or_reflects"] })];
    expect(buildIdentityBrief(corpus).signalRelations).toEqual([]);
  });

  it("carries the dominant side's newest evidence, capped at two examples", () => {
    const corpus = [
      makeObs({ id: "solo-old", signals: ["chooses_solo_path"], extractedAt: daysBeforeNewest(30) }),
      makeObs({ id: "solo-mid", signals: ["chooses_solo_path"], extractedAt: daysBeforeNewest(20) }),
      makeObs({ id: "solo-new", signals: ["chooses_solo_path"], extractedAt: daysBeforeNewest(10) }),
      makeObs({ id: "collab", signals: ["seeks_collaboration"], extractedAt: NEWEST }),
    ];

    const relation = buildIdentityBrief(corpus).signalRelations[0];
    expect(relation.dominant).toBe("chooses_solo_path");
    expect(relation.evidence.map((e) => e.observationId)).toEqual(["solo-new", "solo-mid"]);
  });
});

// ---------------------------------------------------------------------------
// Identity stability
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — stability bands", () => {
  it("is forming with insufficient history", () => {
    const brief = buildIdentityBrief([makeObs(), makeObs()]);
    expect(brief.stability.band).toBe("forming");
    expect(brief.stability.factors).toEqual(["insufficient_history"]);
  });

  it("is forming when all evidence sits inside a short span", () => {
    const corpus = Array.from({ length: 6 }, (_, i) =>
      makeObs({ momentId: `m${i}`, extractedAt: daysBeforeNewest(i) }),
    );
    const brief = buildIdentityBrief(corpus);
    expect(brief.stability.band).toBe("forming");
    expect(brief.stability.factors).toEqual(["short_evidence_span"]);
  });

  it("is shifting when most active signals are changing", () => {
    const corpus = [
      makeObs({ signals: ["chooses_solo_path"], momentId: "m1", extractedAt: daysBeforeNewest(80) }),
      makeObs({ signals: ["chooses_solo_path"], momentId: "m2", extractedAt: daysBeforeNewest(40) }),
      makeObs({ signals: ["asks_for_help"], momentId: "m3", extractedAt: daysBeforeNewest(20) }),
      makeObs({ signals: ["asks_for_help"], momentId: "m4", extractedAt: daysBeforeNewest(10) }),
      makeObs({ signals: ["explores_new_topic"], momentId: "m5", extractedAt: daysBeforeNewest(5) }),
      makeObs({ signals: ["explores_new_topic"], momentId: "m6", extractedAt: NEWEST }),
    ];

    const brief = buildIdentityBrief(corpus);
    expect(brief.stability.band).toBe("shifting");
    expect(brief.stability.factors).toEqual(["high_recent_change"]);
    expect(brief.stability.metrics.changingShare).toBe(1);
  });

  it("is settled when an established base shows little recent change", () => {
    const corpus = [
      makeObs({ momentId: "m1", extractedAt: daysBeforeNewest(400) }),
      makeObs({ momentId: "m1", extractedAt: daysBeforeNewest(300) }),
      makeObs({ momentId: "m2", extractedAt: daysBeforeNewest(150) }),
      makeObs({ momentId: "m2", extractedAt: daysBeforeNewest(120) }),
      makeObs({ momentId: "m2", extractedAt: daysBeforeNewest(100) }),
      makeObs({ momentId: "m3", extractedAt: daysBeforeNewest(60) }),
      makeObs({ momentId: "m3", extractedAt: daysBeforeNewest(30) }),
      makeObs({ momentId: "m3", extractedAt: NEWEST }),
    ];

    const brief = buildIdentityBrief(corpus);
    // One signal, 8 occurrences across 3 situations → stage "defining",
    // 3 recent vs 3 previous → trend "stable".
    expect(brief.stability.band).toBe("settled");
    expect(brief.stability.factors).toEqual(["broad_established_base", "low_recent_change"]);
    expect(brief.stability.metrics.establishedShare).toBe(1);
    expect(brief.stability.metrics.changingShare).toBe(0);
  });

  it("is steadying between those extremes", () => {
    const corpus = [
      // Two stable signals (1 recent + 1 previous each), one emerged.
      makeObs({ signals: ["chooses_solo_path"], momentId: "m1", extractedAt: daysBeforeNewest(120) }),
      makeObs({ signals: ["chooses_solo_path"], momentId: "m2", extractedAt: daysBeforeNewest(40) }),
      makeObs({ signals: ["asks_for_help"], momentId: "m1", extractedAt: daysBeforeNewest(100) }),
      makeObs({ signals: ["asks_for_help"], momentId: "m3", extractedAt: daysBeforeNewest(20) }),
      makeObs({ signals: ["explores_new_topic"], momentId: "m4", extractedAt: NEWEST }),
    ];

    const brief = buildIdentityBrief(corpus);
    expect(brief.stability.band).toBe("steadying");
    expect(brief.stability.factors).toEqual([
      "moderate_recent_change",
      "limited_established_base",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Adaptive representative evidence
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — adaptive representative evidence", () => {
  function corpusOfSize(total: number): LedgerObservation[] {
    // Every observation carries the same signal so plenty of evidence exists.
    return Array.from({ length: total }, (_, i) =>
      makeObs({ momentId: `m${i % 4}`, extractedAt: daysBeforeNewest(total - 1 - i) }),
    );
  }

  it("classifies profile maturity by evidence volume", () => {
    expect(profileMaturity(0)).toBe("weak");
    expect(profileMaturity(7)).toBe("weak");
    expect(profileMaturity(8)).toBe("growing");
    expect(profileMaturity(19)).toBe("growing");
    expect(profileMaturity(20)).toBe("established");
  });

  it("exposes 2 examples for weak profiles", () => {
    const brief = buildIdentityBrief(corpusOfSize(6));
    expect(brief.summary.maturity).toBe("weak");
    expect(brief.topSignals[0].representativeEvidence).toHaveLength(EVIDENCE_BUDGET.weak);
  });

  it("exposes 3 examples for growing profiles", () => {
    const brief = buildIdentityBrief(corpusOfSize(12));
    expect(brief.summary.maturity).toBe("growing");
    expect(brief.topSignals[0].representativeEvidence).toHaveLength(EVIDENCE_BUDGET.growing);
  });

  it("exposes 5 examples for established profiles", () => {
    const brief = buildIdentityBrief(corpusOfSize(24));
    expect(brief.summary.maturity).toBe("established");
    expect(brief.topSignals[0].representativeEvidence).toHaveLength(EVIDENCE_BUDGET.established);
  });

  it("never exceeds the evidence a signal actually has", () => {
    // 24 observations (established profile) but the second signal has one.
    const corpus = [
      ...corpusOfSize(23),
      makeObs({ signals: ["asks_for_help"], momentId: "m9", extractedAt: NEWEST }),
    ];
    const brief = buildIdentityBrief(corpus);
    expect(signalIn(brief, "asks_for_help")?.representativeEvidence).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Summary metrics
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — summary metrics", () => {
  it("reports totals, breadth, and dormancy from the ledger", () => {
    const brief = buildIdentityBrief(briefCorpus());

    expect(brief.summary.totalObservations).toBe(7);
    expect(brief.summary.breadth).toBe(4); // m1..m4
    expect(brief.summary.dormantSignalCount).toBe(1); // journals_or_reflects
    expect(brief.summary.activeSignalCount).toBe(3);
    expect(brief.summary.strongestSignal).toBe("chooses_solo_path");
    expect(brief.summary.newestSignal).toBe("starts_something_new");
    expect(brief.summary.evidenceSpanDays).toBe(400);
    expect(brief.summary.maturity).toBe("weak");
  });
});

// ---------------------------------------------------------------------------
// Ranked futures
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — ranked futures", () => {
  it("matches the product's deterministic recognition on the same ledger", () => {
    const corpus = briefCorpus();
    const brief = buildIdentityBrief(corpus);
    const expected = recognizeIdentitiesFromObservations(corpus);

    expect(brief.rankedFutures.map((f) => f.identityId)).toEqual(
      expected.map((m) => m.identityId),
    );
    expect(brief.rankedFutures.map((f) => f.likelihood)).toEqual(
      expected.map((m) => m.likelihood),
    );
  });

  it("exposes only structured ranking and attribution fields — no narrative keys", () => {
    const brief = buildIdentityBrief(briefCorpus());

    expect(brief.rankedFutures.length).toBeGreaterThan(0);
    for (const future of brief.rankedFutures) {
      expect(Object.keys(future).sort()).toEqual([
        "canonicalName",
        "confidence",
        "evidenceStrength",
        "identityId",
        "likelihood",
        "matchedDimensions",
        "opposingDimensions",
        "opposingEvidence",
        "score",
        "supportingDimensions",
        "supportingEvidence",
        "supportingObservationCount",
        "supportingSituationCount",
      ]);
      expect(future.confidence).toBeGreaterThanOrEqual(0);
      expect(future.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("re-exposes the recognition engine's attribution exactly (v4.3)", () => {
    const corpus = briefCorpus();
    const brief = buildIdentityBrief(corpus);
    const matches = recognizeIdentitiesWithAttribution(
      corpus.map((o) => ({
        id: o.id,
        observation: o.observation,
        signals: o.signals,
        momentId: o.momentId,
        momentTitle: "",
        extractedAt: o.extractedAt,
      })),
    );

    expect(brief.rankedFutures).toHaveLength(matches.length);

    for (const [index, future] of brief.rankedFutures.entries()) {
      const match = matches[index];

      expect(future.identityId).toBe(match.identityId);
      expect(future.supportingDimensions).toEqual(match.dimensionBreakdown);
      expect(future.opposingDimensions).toEqual(match.opposingDimensions);
      expect(future.supportingSituationCount).toBe(match.supportingSituationCount);
      expect(future.supportingObservationCount).toBe(match.supportingObservationCount);
      expect(future.supportingEvidence).toEqual(
        match.supportingObservations.map((obs) => ({
          observationId: obs.observationId,
          observation: obs.observationText,
          momentId: obs.momentId,
          contribution: obs.contribution,
        })),
      );
      expect(future.opposingEvidence).toEqual(
        match.opposingObservations.map((obs) => ({
          observationId: obs.observationId,
          observation: obs.observationText,
          momentId: obs.momentId,
          contribution: obs.contribution,
        })),
      );
    }
  });

  it("keeps the uncapped supporting counts at least as large as the capped lists", () => {
    const brief = buildIdentityBrief(briefCorpus());

    for (const future of brief.rankedFutures) {
      expect(future.supportingObservationCount!).toBeGreaterThanOrEqual(
        future.supportingEvidence!.length,
      );
      expect(future.supportingSituationCount!).toBeGreaterThanOrEqual(
        Math.min(future.supportingEvidence!.length, 1),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// No generated prose anywhere in the brief
// ---------------------------------------------------------------------------

describe("buildIdentityBrief — structured data only", () => {
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

  function collectStrings(value: unknown, out: string[]): void {
    if (typeof value === "string") {
      out.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) collectStrings(item, out);
    } else if (value && typeof value === "object") {
      for (const item of Object.values(value)) collectStrings(item, out);
    }
  }

  it("contains only vocabulary strings, ids, timestamps, and verbatim ledger text", () => {
    const corpus = briefCorpus();
    const brief = buildIdentityBrief(corpus);

    const allowed = new Set<string>([
      ...SIGNAL_SLUGS,
      // stages
      "glimpsed", "emerging", "established", "defining",
      // trends
      "emerged", "returned", "strengthened", "weakened", "stable", "dormant",
      // stability bands + factors
      "forming", "shifting", "steadying", "settled",
      "insufficient_history", "short_evidence_span", "high_recent_change",
      "moderate_recent_change", "low_recent_change",
      "broad_established_base", "limited_established_base",
      // maturity
      "weak", "growing", "established",
      // evidence strength enum
      "Strong", "Moderate", "Emerging",
      ...ALL_DIMENSIONS,
      BEHAVIOR_ENGINE_VERSION,
      ...IDENTITY_LIBRARY.flatMap((identity) => [identity.id, identity.canonical_name]),
      // verbatim ledger data
      ...corpus.flatMap((o) => [
        o.id,
        o.momentId,
        o.sourceType,
        o.observation,
        ...(o.extractedAt ? [o.extractedAt] : []),
      ]),
    ]);

    const strings: string[] = [];
    collectStrings(brief, strings);

    expect(strings.length).toBeGreaterThan(0);
    for (const value of strings) {
      const ok = allowed.has(value) || ISO_RE.test(value);
      expect(ok, `unexpected free-form string in brief: "${value}"`).toBe(true);
    }
  });
});
