import {
  isValidSignalSlug,
  observationReferenceTimeMs,
  observationTimeWeight,
  EMPTY_DIMENSION_SCORES,
  SIGNAL_DEFINITIONS,
  type SignalSlug,
} from "@/lib/behavior-signals";
import type { DimensionScoreMap } from "@/types/behavior";

// ---------------------------------------------------------------------------
// Behavior Engine v4 — Phase 1: the Behavior Ledger (shadow mode)
// ---------------------------------------------------------------------------
//
// Layer 0 is the existing behavior_observations table: it is already an
// append-only event log of extracted observations, so "writing into the
// ledger" is the write that persistObservations already performs. This module
// adds no second write path and no second extraction — the ledger is a pure
// fold over those rows.
//
// Layer 1 (SignalState) folds the event log into one durable state per signal:
// how often it has occurred, across how many distinct situations, when it was
// first seen and last strengthened, how much time-decayed evidence backs it,
// and which observations best represent it.
//
// Layer 2 (BehaviorLedgerSnapshot) is generated entirely from SignalState.
//
// NOTHING consumes any of this yet. The legacy path
// (computeDimensionScoresFromObservations → recognizeIdentities) remains the
// only source of truth; behavior-ledger-shadow.ts compares the two after each
// extraction and logs discrepancies in development.
//
// Determinism contract (same as the legacy engine): the fold is a pure
// function of the observation rows alone. Time decay is anchored to the
// newest observation in the ledger, never the wall clock, so the same rows
// always produce the same states — in tests, in production, and for a
// returning user.

/**
 * One behavior_observations row, in the camelCase shape the pure layers use
 * (mirrors AttributableObservation in identity-recognition.ts).
 */
export type LedgerObservation = {
  id: string;
  observation: string;
  signals: string[];
  momentId: string;
  sourceType: string;
  /** ISO timestamp (behavior_observations.extracted_at). Absent ⇒ full
   *  weight, treated as oldest for ordering. */
  extractedAt?: string;
};

/**
 * How settled a signal is, as a monotonic ladder. Raw occurrence count alone
 * can never promote past "emerging" — reaching "established" or "defining"
 * requires breadth, i.e. the same behavior showing up across distinct
 * situations rather than repeatedly in one.
 */
export type SignalStage = "glimpsed" | "emerging" | "established" | "defining";

export type RepresentativeEvidence = {
  observationId: string;
  observation: string;
  momentId: string;
  sourceType: string;
  extractedAt: string | null;
};

/** Layer 1: the durable per-signal state folded from the observation log. */
export type SignalState = {
  slug: SignalSlug;
  /** How many observations carried this signal (undecayed). */
  rawCount: number;
  /** Distinct situations (moments) the signal appeared in. */
  breadth: number;
  /** Earliest extracted_at among occurrences; null if none carried one. */
  firstSeenAt: string | null;
  /** Latest extracted_at among occurrences; null if none carried one. */
  lastStrengthenedAt: string | null;
  /** Time-decayed occurrence sum: Σ observationTimeWeight(occurrence),
   *  anchored to the newest observation in the whole ledger. */
  evidenceStrength: number;
  /** 0–1 certainty from evidence quantity and situation diversity. */
  confidence: number;
  stage: SignalStage;
  /** Up to MAX_REPRESENTATIVE_EVIDENCE occurrences, newest first. */
  representativeEvidence: RepresentativeEvidence[];
};

/** Layer 2: generated entirely from SignalState (plus ledger-level counts). */
export type BehaviorLedgerSnapshot = {
  /** Total observation rows folded, including ones with no valid signal. */
  totalObservations: number;
  /** Decay anchor: newest extracted_at across the ledger, in epoch ms. */
  referenceTimeMs: number | null;
  /** Every signal with at least one occurrence, strongest first. */
  signals: SignalState[];
  /** Dimension scores derived from SignalState evidence strengths. Must
   *  equal the legacy computeDimensionScoresFromObservations — that parity
   *  is what shadow mode verifies. */
  dimensionScores: DimensionScoreMap;
};

// The ledger retains the maximum any consumer needs; the Identity Brief
// (phase 2) exposes an adaptive slice of these — 2 for weak profiles, 3 for
// growing, 5 for established — so 5 is the retention ceiling.
export const MAX_REPRESENTATIVE_EVIDENCE = 5;

// Stage thresholds. Counts are undecayed occurrences; breadth is distinct
// situations. Chosen so one talkative situation cannot mint an "established"
// trait: repetition alone stalls at "emerging".
const EMERGING_MIN_COUNT = 2;
const ESTABLISHED_MIN_COUNT = 4;
const ESTABLISHED_MIN_BREADTH = 2;
const DEFINING_MIN_COUNT = 7;
const DEFINING_MIN_BREADTH = 3;

// Confidence saturation points, mirroring the legacy engine's blend of
// observation coverage (70%) and situation diversity (30%) in
// identity-recognition.ts — but per signal. Strength saturates at 10 decayed
// occurrences; breadth at 5 distinct situations.
const CONFIDENCE_STRENGTH_SATURATION = 10;
const CONFIDENCE_BREADTH_SATURATION = 5;

export function signalStage(rawCount: number, breadth: number): SignalStage {
  if (rawCount >= DEFINING_MIN_COUNT && breadth >= DEFINING_MIN_BREADTH) {
    return "defining";
  }
  if (rawCount >= ESTABLISHED_MIN_COUNT && breadth >= ESTABLISHED_MIN_BREADTH) {
    return "established";
  }
  if (rawCount >= EMERGING_MIN_COUNT) {
    return "emerging";
  }
  return "glimpsed";
}

export function signalConfidence(evidenceStrength: number, breadth: number): number {
  if (evidenceStrength <= 0) return 0;

  const strengthFactor = Math.min(1, evidenceStrength / CONFIDENCE_STRENGTH_SATURATION);
  const breadthFactor = Math.min(1, breadth / CONFIDENCE_BREADTH_SATURATION);

  return strengthFactor * 0.7 + breadthFactor * 0.3;
}

/** Epoch ms of an occurrence, or null when absent/unparseable. */
function occurrenceTimeMs(extractedAt: string | undefined): number | null {
  if (!extractedAt) return null;
  const time = Date.parse(extractedAt);
  return Number.isNaN(time) ? null : time;
}

type Accumulator = {
  slug: SignalSlug;
  rawCount: number;
  momentIds: Set<string>;
  firstSeenAt: string | null;
  firstSeenMs: number | null;
  lastStrengthenedAt: string | null;
  lastStrengthenedMs: number | null;
  evidenceStrength: number;
  occurrences: { observation: LedgerObservation; timeMs: number | null }[];
};

/**
 * Layer 1 fold: observation rows → one SignalState per signal that has
 * occurred at least once. Unknown signal slugs are ignored, exactly as the
 * legacy scorer ignores them. Output is sorted strongest-first (ties broken
 * by slug) so the result is deterministic regardless of input order.
 */
export function buildSignalStates(observations: LedgerObservation[]): SignalState[] {
  const referenceTimeMs = observationReferenceTimeMs(observations);
  const accumulators = new Map<SignalSlug, Accumulator>();

  for (const observation of observations) {
    const timeMs = occurrenceTimeMs(observation.extractedAt);
    const timeWeight = observationTimeWeight(observation.extractedAt, referenceTimeMs);

    for (const slug of observation.signals) {
      if (!isValidSignalSlug(slug)) continue;

      let acc = accumulators.get(slug);
      if (!acc) {
        acc = {
          slug,
          rawCount: 0,
          momentIds: new Set(),
          firstSeenAt: null,
          firstSeenMs: null,
          lastStrengthenedAt: null,
          lastStrengthenedMs: null,
          evidenceStrength: 0,
          occurrences: [],
        };
        accumulators.set(slug, acc);
      }

      acc.rawCount += 1;
      acc.momentIds.add(observation.momentId);
      acc.evidenceStrength += timeWeight;
      acc.occurrences.push({ observation, timeMs });

      if (timeMs !== null) {
        if (acc.firstSeenMs === null || timeMs < acc.firstSeenMs) {
          acc.firstSeenMs = timeMs;
          acc.firstSeenAt = observation.extractedAt ?? null;
        }
        if (acc.lastStrengthenedMs === null || timeMs > acc.lastStrengthenedMs) {
          acc.lastStrengthenedMs = timeMs;
          acc.lastStrengthenedAt = observation.extractedAt ?? null;
        }
      }
    }
  }

  const states = [...accumulators.values()].map((acc) => {
    const breadth = acc.momentIds.size;

    // Newest occurrences represent the signal best under time decay.
    // Timestamped occurrences come first (newest first); untimestamped ones
    // sort last. Ties break by observation id so the pick is deterministic.
    const representativeEvidence = [...acc.occurrences]
      .sort((a, b) => {
        if (a.timeMs === null && b.timeMs === null) {
          return a.observation.id < b.observation.id ? -1 : 1;
        }
        if (a.timeMs === null) return 1;
        if (b.timeMs === null) return -1;
        if (a.timeMs !== b.timeMs) return b.timeMs - a.timeMs;
        return a.observation.id < b.observation.id ? -1 : 1;
      })
      .slice(0, MAX_REPRESENTATIVE_EVIDENCE)
      .map(({ observation }) => ({
        observationId: observation.id,
        observation: observation.observation,
        momentId: observation.momentId,
        sourceType: observation.sourceType,
        extractedAt: observation.extractedAt ?? null,
      }));

    return {
      slug: acc.slug,
      rawCount: acc.rawCount,
      breadth,
      firstSeenAt: acc.firstSeenAt,
      lastStrengthenedAt: acc.lastStrengthenedAt,
      evidenceStrength: acc.evidenceStrength,
      confidence: signalConfidence(acc.evidenceStrength, breadth),
      stage: signalStage(acc.rawCount, breadth),
      representativeEvidence,
    };
  });

  states.sort((a, b) => {
    if (a.evidenceStrength !== b.evidenceStrength) {
      return b.evidenceStrength - a.evidenceStrength;
    }
    return a.slug < b.slug ? -1 : 1;
  });

  return states;
}

/**
 * Layer 2: the snapshot, generated entirely from SignalState. Dimension
 * scores come from per-signal evidence strengths:
 *
 *   score[d] = Σ over signals s: dimensionWeight(s, d) × evidenceStrength(s)
 *
 * which is the legacy per-observation sum regrouped by signal, so it must
 * agree with computeDimensionScoresFromObservations to floating-point
 * precision. Shadow mode asserts exactly that.
 */
export function snapshotFromSignalStates(
  states: SignalState[],
  meta: { totalObservations: number; referenceTimeMs: number | null },
): BehaviorLedgerSnapshot {
  const dimensionScores = { ...EMPTY_DIMENSION_SCORES };

  for (const state of states) {
    for (const { dimension, weight } of SIGNAL_DEFINITIONS[state.slug].dimensions) {
      dimensionScores[dimension] += weight * state.evidenceStrength;
    }
  }

  return {
    totalObservations: meta.totalObservations,
    referenceTimeMs: meta.referenceTimeMs,
    signals: states,
    dimensionScores,
  };
}

/** Convenience composition: fold rows to states, then snapshot the states. */
export function buildLedgerSnapshot(
  observations: LedgerObservation[],
): BehaviorLedgerSnapshot {
  return snapshotFromSignalStates(buildSignalStates(observations), {
    totalObservations: observations.length,
    referenceTimeMs: observationReferenceTimeMs(observations),
  });
}
