import { describe, expect, it } from "vitest";

import {
  buildLedgerSnapshot,
  buildSignalStates,
  MAX_REPRESENTATIVE_EVIDENCE,
  signalConfidence,
  signalStage,
  snapshotFromSignalStates,
  type LedgerObservation,
} from "@/lib/behavior-ledger";
import {
  compareLedgerToLegacy,
  findLedgerDiscrepancies,
  rowToLedgerObservation,
} from "@/lib/behavior-ledger-shadow";
import {
  ALL_DIMENSIONS,
  computeDimensionScoresFromObservations,
  observationReferenceTimeMs,
  OBSERVATION_HALF_LIFE_DAYS,
} from "@/lib/behavior-signals";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NEWEST = "2026-01-01T00:00:00.000Z";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO timestamp N days before the NEWEST anchor. */
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

function stateFor(observations: LedgerObservation[], slug: string) {
  return buildSignalStates(observations).find((s) => s.slug === slug);
}

// ---------------------------------------------------------------------------
// Signal accumulation
// ---------------------------------------------------------------------------

describe("buildSignalStates — accumulation", () => {
  it("creates one state per signal with rawCount 1 for a single observation", () => {
    const states = buildSignalStates([makeObs()]);

    expect(states).toHaveLength(1);
    expect(states[0].slug).toBe("starts_something_new");
    expect(states[0].rawCount).toBe(1);
    expect(states[0].breadth).toBe(1);
    expect(states[0].evidenceStrength).toBe(1);
  });

  it("counts every occurrence of a signal across observations", () => {
    const observations = [makeObs(), makeObs(), makeObs()];
    expect(stateFor(observations, "starts_something_new")?.rawCount).toBe(3);
  });

  it("splits a multi-signal observation into each signal's state", () => {
    const observations = [
      makeObs({ signals: ["asks_for_help", "journals_or_reflects"] }),
    ];
    const states = buildSignalStates(observations);

    expect(states.map((s) => s.slug).sort()).toEqual([
      "asks_for_help",
      "journals_or_reflects",
    ]);
    expect(states.every((s) => s.rawCount === 1)).toBe(true);
  });

  it("ignores unknown signal slugs entirely", () => {
    const observations = [
      makeObs({ signals: ["not_a_real_signal", "starts_something_new"] }),
    ];
    const states = buildSignalStates(observations);

    expect(states).toHaveLength(1);
    expect(states[0].slug).toBe("starts_something_new");
  });

  it("produces no states from an empty ledger", () => {
    expect(buildSignalStates([])).toEqual([]);
  });

  it("decays older occurrences by the shared one-year half-life", () => {
    const observations = [
      makeObs({ extractedAt: NEWEST }),
      makeObs({ extractedAt: daysBeforeNewest(OBSERVATION_HALF_LIFE_DAYS) }),
    ];

    const state = stateFor(observations, "starts_something_new");
    expect(state?.rawCount).toBe(2);
    expect(state?.evidenceStrength).toBeCloseTo(1.5, 10);
  });

  it("gives full weight to observations without a timestamp", () => {
    const observations = [
      makeObs({ extractedAt: undefined }),
      makeObs({ extractedAt: undefined }),
    ];

    expect(stateFor(observations, "starts_something_new")?.evidenceStrength).toBe(2);
  });

  it("tracks firstSeenAt and lastStrengthenedAt across occurrences", () => {
    const first = daysBeforeNewest(400);
    const middle = daysBeforeNewest(100);
    const observations = [
      makeObs({ extractedAt: middle }),
      makeObs({ extractedAt: first }),
      makeObs({ extractedAt: NEWEST }),
    ];

    const state = stateFor(observations, "starts_something_new");
    expect(state?.firstSeenAt).toBe(first);
    expect(state?.lastStrengthenedAt).toBe(NEWEST);
  });

  it("leaves firstSeenAt/lastStrengthenedAt null when no occurrence has a timestamp", () => {
    const state = stateFor([makeObs({ extractedAt: undefined })], "starts_something_new");
    expect(state?.firstSeenAt).toBeNull();
    expect(state?.lastStrengthenedAt).toBeNull();
  });

  it("is independent of input order", () => {
    const observations = [
      makeObs({ momentId: "m1", extractedAt: daysBeforeNewest(300) }),
      makeObs({ momentId: "m2", extractedAt: daysBeforeNewest(30), signals: ["asks_for_help"] }),
      makeObs({ momentId: "m3", extractedAt: NEWEST, signals: ["starts_something_new", "asks_for_help"] }),
    ];

    const forward = buildSignalStates(observations);
    const reversed = buildSignalStates([...observations].reverse());

    expect(reversed).toEqual(forward);
  });
});

// ---------------------------------------------------------------------------
// Breadth
// ---------------------------------------------------------------------------

describe("buildSignalStates — breadth", () => {
  it("keeps breadth at 1 when every occurrence comes from the same situation", () => {
    const observations = [
      makeObs({ momentId: "m1" }),
      makeObs({ momentId: "m1" }),
      makeObs({ momentId: "m1" }),
    ];

    const state = stateFor(observations, "starts_something_new");
    expect(state?.rawCount).toBe(3);
    expect(state?.breadth).toBe(1);
  });

  it("counts each distinct situation once", () => {
    const observations = [
      makeObs({ momentId: "m1" }),
      makeObs({ momentId: "m2" }),
      makeObs({ momentId: "m2" }),
      makeObs({ momentId: "m3" }),
    ];

    expect(stateFor(observations, "starts_something_new")?.breadth).toBe(3);
  });

  it("tracks breadth per signal, not across the whole ledger", () => {
    const observations = [
      makeObs({ momentId: "m1", signals: ["starts_something_new"] }),
      makeObs({ momentId: "m2", signals: ["starts_something_new"] }),
      makeObs({ momentId: "m3", signals: ["asks_for_help"] }),
    ];

    expect(stateFor(observations, "starts_something_new")?.breadth).toBe(2);
    expect(stateFor(observations, "asks_for_help")?.breadth).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Representative evidence
// ---------------------------------------------------------------------------

describe("buildSignalStates — representative evidence", () => {
  it("keeps the newest occurrences first and caps the list", () => {
    const observations = [
      makeObs({ id: "a", extractedAt: daysBeforeNewest(5) }),
      makeObs({ id: "b", extractedAt: daysBeforeNewest(4) }),
      makeObs({ id: "c", extractedAt: daysBeforeNewest(3) }),
      makeObs({ id: "d", extractedAt: daysBeforeNewest(2) }),
      makeObs({ id: "e", extractedAt: daysBeforeNewest(1) }),
      makeObs({ id: "f", extractedAt: NEWEST }),
    ];

    const evidence = stateFor(observations, "starts_something_new")!.representativeEvidence;

    expect(evidence).toHaveLength(MAX_REPRESENTATIVE_EVIDENCE);
    expect(evidence.map((e) => e.observationId)).toEqual(["f", "e", "d", "c", "b"]);
  });

  it("carries the observation text and provenance fields", () => {
    const observations = [
      makeObs({
        id: "obs-x",
        observation: "Asked a mentor for a code review.",
        signals: ["asks_for_help"],
        momentId: "moment-42",
        sourceType: "check_in",
        extractedAt: NEWEST,
      }),
    ];

    const evidence = stateFor(observations, "asks_for_help")!.representativeEvidence;
    expect(evidence).toEqual([
      {
        observationId: "obs-x",
        observation: "Asked a mentor for a code review.",
        momentId: "moment-42",
        sourceType: "check_in",
        extractedAt: NEWEST,
      },
    ]);
  });

  it("sorts untimestamped occurrences after timestamped ones", () => {
    const observations = [
      makeObs({ id: "untimed", extractedAt: undefined }),
      makeObs({ id: "old", extractedAt: daysBeforeNewest(500) }),
    ];

    const evidence = stateFor(observations, "starts_something_new")!.representativeEvidence;
    expect(evidence.map((e) => e.observationId)).toEqual(["old", "untimed"]);
    expect(evidence[1].extractedAt).toBeNull();
  });

  it("breaks timestamp ties by observation id, deterministically", () => {
    const observations = [
      makeObs({ id: "b", extractedAt: NEWEST }),
      makeObs({ id: "a", extractedAt: NEWEST }),
    ];

    const evidence = stateFor(observations, "starts_something_new")!.representativeEvidence;
    expect(evidence.map((e) => e.observationId)).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// Stage transitions
// ---------------------------------------------------------------------------

describe("signalStage — ladder", () => {
  it("starts at glimpsed with a single occurrence", () => {
    expect(signalStage(1, 1)).toBe("glimpsed");
  });

  it("becomes emerging at two occurrences", () => {
    expect(signalStage(2, 1)).toBe("emerging");
    expect(signalStage(3, 1)).toBe("emerging");
  });

  it("requires breadth to become established — repetition in one situation stalls", () => {
    expect(signalStage(4, 1)).toBe("emerging");
    expect(signalStage(10, 1)).toBe("emerging");
    expect(signalStage(4, 2)).toBe("established");
  });

  it("requires both count and breadth to become defining", () => {
    expect(signalStage(7, 2)).toBe("established");
    expect(signalStage(6, 3)).toBe("established");
    expect(signalStage(7, 3)).toBe("defining");
  });

  it("never demotes as count and breadth grow (monotonic)", () => {
    const order = ["glimpsed", "emerging", "established", "defining"];
    let previous = 0;
    for (let count = 1; count <= 10; count++) {
      for (let breadth = 1; breadth <= count; breadth++) {
        const rank = order.indexOf(signalStage(count, breadth));
        expect(rank).toBeGreaterThanOrEqual(0);
        if (breadth === count) {
          // Along the diagonal (every occurrence a new situation) the stage
          // can only move up.
          expect(rank).toBeGreaterThanOrEqual(previous);
          previous = rank;
        }
      }
    }
  });
});

describe("buildSignalStates — stage transitions from real accumulation", () => {
  it("walks glimpsed → emerging → established → defining as evidence accumulates", () => {
    const timeline: LedgerObservation[] = [];
    const stageAfter = (obs: LedgerObservation) => {
      timeline.push(obs);
      return stateFor(timeline, "starts_something_new")!.stage;
    };

    expect(stageAfter(makeObs({ momentId: "m1" }))).toBe("glimpsed");
    expect(stageAfter(makeObs({ momentId: "m1" }))).toBe("emerging");
    expect(stageAfter(makeObs({ momentId: "m1" }))).toBe("emerging");
    // Fourth occurrence but still one situation: stalls at emerging.
    expect(stageAfter(makeObs({ momentId: "m1" }))).toBe("emerging");
    // A second situation unlocks established.
    expect(stageAfter(makeObs({ momentId: "m2" }))).toBe("established");
    expect(stageAfter(makeObs({ momentId: "m2" }))).toBe("established");
    // Seventh occurrence, third situation: defining.
    expect(stageAfter(makeObs({ momentId: "m3" }))).toBe("defining");
  });
});

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

describe("signalConfidence", () => {
  it("is zero with no evidence", () => {
    expect(signalConfidence(0, 0)).toBe(0);
  });

  it("grows with evidence strength and breadth", () => {
    expect(signalConfidence(2, 1)).toBeGreaterThan(signalConfidence(1, 1));
    expect(signalConfidence(2, 3)).toBeGreaterThan(signalConfidence(2, 1));
  });

  it("saturates at 1 and never exceeds it", () => {
    expect(signalConfidence(10, 5)).toBe(1);
    expect(signalConfidence(1000, 50)).toBe(1);
  });

  it("stays within [0, 1] for partial evidence", () => {
    const value = signalConfidence(3, 2);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// Snapshot generation
// ---------------------------------------------------------------------------

function mixedCorpus(): LedgerObservation[] {
  return [
    makeObs({ momentId: "m1", extractedAt: daysBeforeNewest(700), signals: ["chooses_solo_path"] }),
    makeObs({ momentId: "m1", extractedAt: daysBeforeNewest(500), signals: ["asks_for_help", "journals_or_reflects"] }),
    makeObs({ momentId: "m2", extractedAt: daysBeforeNewest(200), signals: ["starts_something_new"] }),
    makeObs({ momentId: "m2", extractedAt: daysBeforeNewest(100), signals: ["avoids_conflict"] }),
    makeObs({ momentId: "m3", extractedAt: daysBeforeNewest(10), signals: ["starts_something_new", "asks_for_help"] }),
    makeObs({ momentId: "m4", extractedAt: NEWEST, signals: ["starts_something_new"] }),
    // Signal-less and unknown-signal rows still count toward totals.
    makeObs({ momentId: "m4", extractedAt: NEWEST, signals: [] }),
    makeObs({ momentId: "m4", extractedAt: NEWEST, signals: ["mystery_signal"] }),
  ];
}

describe("buildLedgerSnapshot", () => {
  it("produces an empty snapshot from an empty ledger", () => {
    const snapshot = buildLedgerSnapshot([]);

    expect(snapshot.totalObservations).toBe(0);
    expect(snapshot.referenceTimeMs).toBeNull();
    expect(snapshot.signals).toEqual([]);
    for (const dimension of ALL_DIMENSIONS) {
      expect(snapshot.dimensionScores[dimension]).toBe(0);
    }
  });

  it("counts every row in totalObservations, including signal-less ones", () => {
    const corpus = mixedCorpus();
    expect(buildLedgerSnapshot(corpus).totalObservations).toBe(corpus.length);
  });

  it("anchors referenceTimeMs to the newest observation", () => {
    const corpus = mixedCorpus();
    expect(buildLedgerSnapshot(corpus).referenceTimeMs).toBe(
      observationReferenceTimeMs(corpus),
    );
  });

  it("sorts signals strongest-first with slug tie-break", () => {
    const snapshot = buildLedgerSnapshot(mixedCorpus());
    const strengths = snapshot.signals.map((s) => s.evidenceStrength);

    for (let i = 1; i < strengths.length; i++) {
      expect(strengths[i]).toBeLessThanOrEqual(strengths[i - 1]);
    }
    // starts_something_new has the most recent, most frequent evidence.
    expect(snapshot.signals[0].slug).toBe("starts_something_new");
  });

  it("derives dimension scores that match the legacy engine exactly", () => {
    const corpus = mixedCorpus();
    const snapshot = buildLedgerSnapshot(corpus);
    const legacy = computeDimensionScoresFromObservations(corpus);

    for (const dimension of ALL_DIMENSIONS) {
      expect(snapshot.dimensionScores[dimension]).toBeCloseTo(legacy[dimension], 9);
    }
  });

  it("matches the legacy engine on undecayed (timestamp-free) ledgers too", () => {
    const corpus = [
      makeObs({ extractedAt: undefined, signals: ["asks_for_help"] }),
      makeObs({ extractedAt: undefined, signals: ["avoids_conflict", "defers_to_others"] }),
    ];

    const snapshot = buildLedgerSnapshot(corpus);
    const legacy = computeDimensionScoresFromObservations(corpus);

    for (const dimension of ALL_DIMENSIONS) {
      expect(snapshot.dimensionScores[dimension]).toBeCloseTo(legacy[dimension], 9);
    }
  });

  it("is a pure composition of buildSignalStates and snapshotFromSignalStates", () => {
    const corpus = mixedCorpus();
    const composed = snapshotFromSignalStates(buildSignalStates(corpus), {
      totalObservations: corpus.length,
      referenceTimeMs: observationReferenceTimeMs(corpus),
    });

    expect(buildLedgerSnapshot(corpus)).toEqual(composed);
  });
});

// ---------------------------------------------------------------------------
// Shadow comparator
// ---------------------------------------------------------------------------

describe("shadow comparator", () => {
  it("reports no discrepancies when ledger and legacy engine agree", () => {
    expect(compareLedgerToLegacy(mixedCorpus())).toEqual([]);
    expect(compareLedgerToLegacy([])).toEqual([]);
  });

  it("flags a tampered dimension score", () => {
    const corpus = mixedCorpus();
    const snapshot = buildLedgerSnapshot(corpus);
    snapshot.dimensionScores.Initiative += 1;

    const discrepancies = findLedgerDiscrepancies(snapshot, corpus);
    expect(discrepancies).toHaveLength(1);
    expect(discrepancies[0].kind).toBe("dimension_score");
    expect(discrepancies[0].detail).toContain("Initiative");
  });

  it("flags a tampered raw count", () => {
    const corpus = mixedCorpus();
    const snapshot = buildLedgerSnapshot(corpus);
    snapshot.signals[0].rawCount += 1;

    const discrepancies = findLedgerDiscrepancies(snapshot, corpus);
    expect(discrepancies.some((d) => d.kind === "raw_count")).toBe(true);
  });

  it("flags a signal missing from the ledger", () => {
    const corpus = mixedCorpus();
    const snapshot = buildLedgerSnapshot(corpus);
    snapshot.signals = snapshot.signals.filter((s) => s.slug !== "asks_for_help");

    const discrepancies = findLedgerDiscrepancies(snapshot, corpus);
    expect(
      discrepancies.some(
        (d) => d.kind === "signal_set" && d.detail.includes("asks_for_help"),
      ),
    ).toBe(true);
  });

  it("flags a signal present in the ledger but absent from observations", () => {
    const corpus = [makeObs({ signals: ["asks_for_help"] })];
    const phantom = buildLedgerSnapshot([makeObs({ signals: ["asks_for_help", "avoids_conflict"] })]);

    const discrepancies = findLedgerDiscrepancies(phantom, corpus);
    expect(
      discrepancies.some(
        (d) => d.kind === "signal_set" && d.detail.includes("avoids_conflict"),
      ),
    ).toBe(true);
  });

  it("ignores unknown slugs on both sides", () => {
    const corpus = [makeObs({ signals: ["asks_for_help", "totally_unknown"] })];
    expect(compareLedgerToLegacy(corpus)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

describe("rowToLedgerObservation", () => {
  it("maps a behavior_observations row into the ledger shape", () => {
    expect(
      rowToLedgerObservation({
        id: "row-1",
        moment_id: "moment-9",
        observation: "Paused to journal about the decision.",
        signals: ["journals_or_reflects"],
        source_type: "reflection_answer",
        extracted_at: NEWEST,
      }),
    ).toEqual({
      id: "row-1",
      observation: "Paused to journal about the decision.",
      signals: ["journals_or_reflects"],
      momentId: "moment-9",
      sourceType: "reflection_answer",
      extractedAt: NEWEST,
    });
  });

  it("converts a null extracted_at to undefined (full weight)", () => {
    const mapped = rowToLedgerObservation({
      id: "row-2",
      moment_id: "moment-9",
      observation: "Legacy row.",
      signals: [],
      source_type: "situation_complete",
      extracted_at: null,
    });

    expect(mapped.extractedAt).toBeUndefined();
  });
});
