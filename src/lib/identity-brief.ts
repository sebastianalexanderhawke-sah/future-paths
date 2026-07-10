import {
  buildLedgerSnapshot,
  type LedgerObservation,
  type RepresentativeEvidence,
  type SignalStage,
  type SignalState,
} from "@/lib/behavior-ledger";
import { type SignalSlug } from "@/lib/behavior-signals";
import {
  recognizeIdentitiesWithAttribution,
  type AttributableObservation,
  type DimensionContribution,
  type IdentityMatchWithAttribution,
  type ObservationContribution,
} from "@/lib/identity-recognition";
import type { IdentityDimension } from "@/types/behavior";
import type { FutureSelfEvidenceStrength } from "@/types/enums";

// ---------------------------------------------------------------------------
// Behavior Engine v4 — Phase 2: the Identity Brief
// ---------------------------------------------------------------------------
//
// The Identity Brief is the shared structured payload every future AI feature
// will consume. Once migration completes, nothing should analyze raw
// observations directly — features that need identity read the brief.
//
// See docs/identity-brief.md for the full contract. The load-bearing rules:
//
//   1. INPUT: the brief is generated entirely from the Behavior Ledger —
//      Layer 0 rows (behavior_observations) folded through the Layer 1/2
//      machinery in behavior-ledger.ts. It never inspects situations,
//      check-ins, or reflections directly.
//   2. DETERMINISM: the brief is a pure function of the ledger rows. Time is
//      anchored to the newest observation (never the wall clock), so the same
//      ledger always produces byte-identical output — generatedAt included.
//   3. STRUCTURED DATA ONLY: no AI calls, no generated prose. The only
//      free-text strings are observation texts carried verbatim from the
//      ledger as representative evidence. Everything else is a slug, enum,
//      id, timestamp, or number. identity-brief.test.ts enforces this
//      structurally.
//
// PHASE 2 STATUS: nothing consumes the brief. It is generated in shadow mode
// after every ledger write (behavior-ledger-shadow.ts) and discarded — not
// persisted, because no consumer exists yet and persistence would need a new
// table. When phase 3 gives it a consumer, persist it then.

// 4.3.0: rankedFutures carry full identity attribution (supporting/opposing
// dimensions and evidence, uncapped supporting counts) — re-exposed from the
// recognition engine, computed nowhere else. See the RankedFuture doc below.
export const BEHAVIOR_ENGINE_VERSION = "4.3.0";

// ---------------------------------------------------------------------------
// Trend classification
// ---------------------------------------------------------------------------
//
// Trends compare activity in two consecutive windows behind the ledger's
// reference time (the newest observation): the recent window (last 90 days)
// and the previous window (90–180 days back). Everything older — including
// legacy rows without a timestamp when the ledger has a reference time —
// counts as "older" history. A 90-day window matches the product's framing of
// identity change in seasons.
//
// When NO observation in the ledger carries a timestamp there is no reference
// time; every occurrence then counts as recent, consistent with the full
// decay weight such rows receive in scoring.

export const TREND_RECENT_WINDOW_DAYS = 90;
export const TREND_PREVIOUS_WINDOW_DAYS = 180;

export type SignalTrend =
  | "emerged" // first ever activity is inside the recent window
  | "returned" // active recently after a quiet previous window, with older history
  | "strengthened" // more recent activity than in the previous window
  | "weakened" // less recent activity than in the previous window
  | "stable" // same activity level in both windows
  | "dormant"; // no activity in the recent window at all

export type SignalWindowCounts = {
  recentCount: number;
  previousCount: number;
  olderCount: number;
};

export function classifySignalTrend(counts: SignalWindowCounts): SignalTrend {
  const { recentCount, previousCount, olderCount } = counts;

  if (recentCount === 0) return "dormant";
  if (previousCount === 0 && olderCount === 0) return "emerged";
  if (previousCount === 0) return "returned";
  if (recentCount > previousCount) return "strengthened";
  if (recentCount < previousCount) return "weakened";
  return "stable";
}

// ---------------------------------------------------------------------------
// Signal relations
// ---------------------------------------------------------------------------
//
// Curated behavioral tensions: pairs of signals that pull in opposite
// directions. The relation reports which side of each tension the evidence
// currently favors. The table is static vocabulary, type-checked against the
// signal library; adding a signal pair here is additive and cannot change any
// existing relation's output.

export const SIGNAL_RELATION_PAIRS: readonly (readonly [SignalSlug, SignalSlug])[] = [
  ["chooses_solo_path", "seeks_collaboration"],
  ["engages_conflict_directly", "avoids_conflict"],
  ["takes_uncertain_risk", "declines_risky_opportunity"],
  ["adapts_to_feedback", "resists_change"],
  ["sets_own_terms", "defers_to_others"],
  ["maintains_commitment", "leaves_completed_chapter"],
];

/** How many representative examples a relation carries (dominant side). */
const RELATION_EVIDENCE_LIMIT = 2;

export type SignalRelation = {
  /** The tension, in the fixed order of SIGNAL_RELATION_PAIRS. */
  signals: [SignalSlug, SignalSlug];
  /** The side with more decayed evidence; null when exactly balanced. */
  dominant: SignalSlug | null;
  /** The other side; null when exactly balanced. */
  opposing: SignalSlug | null;
  dominantStrength: number;
  opposingStrength: number;
  /** 0–1: how lopsided the tension is, discounted while total evidence is
   *  thin. 0 when balanced. */
  confidence: number;
  /** Representative evidence from the dominant side; empty when balanced. */
  evidence: RepresentativeEvidence[];
};

// Lopsidedness needs volume behind it before it means anything: a single
// observation on one side is 100% lopsided but proves nothing. Confidence is
// (lopsidedness) × (evidence saturation at this many decayed occurrences).
const RELATION_STRENGTH_SATURATION = 6;

function buildSignalRelations(states: Map<SignalSlug, SignalState>): SignalRelation[] {
  const relations: SignalRelation[] = [];

  for (const [a, b] of SIGNAL_RELATION_PAIRS) {
    const stateA = states.get(a);
    const stateB = states.get(b);
    const strengthA = stateA?.evidenceStrength ?? 0;
    const strengthB = stateB?.evidenceStrength ?? 0;
    const total = strengthA + strengthB;

    if (total === 0) continue; // no evidence on either side: relation absent

    const balanced = strengthA === strengthB;
    const dominantSlug = balanced ? null : strengthA > strengthB ? a : b;
    const dominantState = dominantSlug === a ? stateA : dominantSlug === b ? stateB : null;

    const lopsidedness = balanced
      ? 0
      : (Math.max(strengthA, strengthB) / total - 0.5) * 2;

    relations.push({
      signals: [a, b],
      dominant: dominantSlug,
      opposing: balanced ? null : dominantSlug === a ? b : a,
      dominantStrength: Math.max(strengthA, strengthB),
      opposingStrength: Math.min(strengthA, strengthB),
      confidence: lopsidedness * Math.min(1, total / RELATION_STRENGTH_SATURATION),
      evidence: dominantState
        ? dominantState.representativeEvidence.slice(0, RELATION_EVIDENCE_LIMIT)
        : [],
    });
  }

  return relations;
}

// ---------------------------------------------------------------------------
// Identity stability
// ---------------------------------------------------------------------------

export type StabilityBand = "forming" | "shifting" | "steadying" | "settled";

/** Structured reasons behind the band — enums, never prose. */
export type StabilityFactor =
  | "insufficient_history"
  | "short_evidence_span"
  | "high_recent_change"
  | "moderate_recent_change"
  | "low_recent_change"
  | "broad_established_base"
  | "limited_established_base";

export type IdentityStability = {
  band: StabilityBand;
  factors: StabilityFactor[];
  metrics: {
    totalObservations: number;
    /** Signals with any activity in the recent trend window. */
    activeSignalCount: number;
    /** Share of evidenced signals at stage established or defining. */
    establishedShare: number;
    /** Share of active signals whose trend is a change
     *  (emerged / strengthened / weakened / returned). */
    changingShare: number;
    /** Days from the earliest timestamped observation to the reference
     *  time; null when the ledger has no timestamps. */
    evidenceSpanDays: number | null;
  };
};

const STABILITY_MIN_OBSERVATIONS = 5;
const STABILITY_MIN_SPAN_DAYS = 30;
const STABILITY_SHIFTING_CHANGE_SHARE = 0.5;
const STABILITY_SETTLED_CHANGE_SHARE = 0.25;
const STABILITY_SETTLED_ESTABLISHED_SHARE = 0.5;

function deriveStability(
  metrics: IdentityStability["metrics"],
): Pick<IdentityStability, "band" | "factors"> {
  const { totalObservations, establishedShare, changingShare, evidenceSpanDays } = metrics;

  if (totalObservations < STABILITY_MIN_OBSERVATIONS) {
    return { band: "forming", factors: ["insufficient_history"] };
  }

  if (evidenceSpanDays !== null && evidenceSpanDays < STABILITY_MIN_SPAN_DAYS) {
    return { band: "forming", factors: ["short_evidence_span"] };
  }

  if (changingShare >= STABILITY_SHIFTING_CHANGE_SHARE) {
    return { band: "shifting", factors: ["high_recent_change"] };
  }

  if (
    establishedShare >= STABILITY_SETTLED_ESTABLISHED_SHARE &&
    changingShare < STABILITY_SETTLED_CHANGE_SHARE
  ) {
    return { band: "settled", factors: ["broad_established_base", "low_recent_change"] };
  }

  return {
    band: "steadying",
    factors: [
      changingShare >= STABILITY_SETTLED_CHANGE_SHARE
        ? "moderate_recent_change"
        : "low_recent_change",
      establishedShare >= STABILITY_SETTLED_ESTABLISHED_SHARE
        ? "broad_established_base"
        : "limited_established_base",
    ],
  };
}

// ---------------------------------------------------------------------------
// Profile maturity → adaptive representative-evidence budget
// ---------------------------------------------------------------------------

export type ProfileMaturity = "weak" | "growing" | "established";

const MATURITY_GROWING_MIN_OBSERVATIONS = 8;
const MATURITY_ESTABLISHED_MIN_OBSERVATIONS = 20;

export function profileMaturity(totalObservations: number): ProfileMaturity {
  if (totalObservations >= MATURITY_ESTABLISHED_MIN_OBSERVATIONS) return "established";
  if (totalObservations >= MATURITY_GROWING_MIN_OBSERVATIONS) return "growing";
  return "weak";
}

export const EVIDENCE_BUDGET: Record<ProfileMaturity, number> = {
  weak: 2,
  growing: 3,
  established: 5,
};

// ---------------------------------------------------------------------------
// Brief structure
// ---------------------------------------------------------------------------

export const TOP_SIGNAL_LIMIT = 10;

export type BriefSignal = {
  signal: SignalSlug;
  stage: SignalStage;
  trend: SignalTrend;
  confidence: number;
  evidenceStrength: number;
  /** Adaptive slice of the ledger's retained evidence: 2 / 3 / 5 examples
   *  for weak / growing / established profiles. */
  representativeEvidence: RepresentativeEvidence[];
};

export type RecentChanges = {
  emerged: SignalSlug[];
  strengthened: SignalSlug[];
  weakened: SignalSlug[];
  dormant: SignalSlug[];
  returned: SignalSlug[];
};

export type BriefSummaryMetrics = {
  totalObservations: number;
  /** Signals with activity inside the recent trend window. */
  activeSignalCount: number;
  /** Evidenced signals with no activity inside the recent trend window. */
  dormantSignalCount: number;
  /** Distinct situations (moments) across the whole ledger. */
  breadth: number;
  strongestSignal: SignalSlug | null;
  /** The evidenced signal with the latest first appearance. */
  newestSignal: SignalSlug | null;
  evidenceSpanDays: number | null;
  maturity: ProfileMaturity;
};

/** One dimension's contribution to an identity match — the recognition
 *  engine's DimensionContribution, re-exposed verbatim. */
export type RankedFutureDimension = DimensionContribution;

/** One observation's contribution to an identity match. Mapped 1:1 from the
 *  engine's ObservationContribution, minus momentTitle: the brief never
 *  inspects moments, so titles are structurally absent (audit gap G2 —
 *  observation texts are written to stand alone). */
export type RankedFutureEvidence = {
  observationId: string;
  observation: string;
  momentId: string;
  contribution: number;
};

export type RankedFuture = {
  identityId: string;
  canonicalName: string;
  score: number;
  /** 0–100, same harmonic scale the product uses today. */
  likelihood: number;
  /** 0–100 evidence-quantity certainty, same formula the product uses. */
  confidence: number;
  evidenceStrength: FutureSelfEvidenceStrength;
  matchedDimensions: IdentityDimension[];

  // -- v4.3 identity attribution -----------------------------------------
  // Re-exposed from recognizeIdentitiesWithAttribution; nothing here is
  // computed in the brief. Typed optional ONLY so consumer views may hide
  // them (Current Self does, to keep its prompt byte-identical — see
  // stripRankedFutureAttribution); buildIdentityBrief always sets them.

  /** Dimensions contributing positively (weight, user score, contribution),
   *  strongest first — the engine's dimensionBreakdown. */
  supportingDimensions?: RankedFutureDimension[];
  /** Dimensions working against the match, most negative first. */
  opposingDimensions?: RankedFutureDimension[];
  /** Top 5 observations driving the match, by decayed contribution. */
  supportingEvidence?: RankedFutureEvidence[];
  /** Top 3 observations working against it, most negative first. */
  opposingEvidence?: RankedFutureEvidence[];
  /** TOTAL distinct situations with net positive contribution (uncapped). */
  supportingSituationCount?: number;
  /** TOTAL observations with positive contribution (uncapped). */
  supportingObservationCount?: number;
};

export type IdentityBrief = {
  behaviorEngineVersion: string;
  /** ISO timestamp of the ledger's newest observation (the decay anchor) —
   *  NOT the wall clock, so the same ledger always produces the same brief.
   *  Null for an empty or timestamp-free ledger. */
  generatedAt: string | null;
  topSignals: BriefSignal[];
  signalRelations: SignalRelation[];
  stability: IdentityStability;
  recentChanges: RecentChanges;
  summary: BriefSummaryMetrics;
  /** Deterministic identity rankings — structured only, no narratives. */
  rankedFutures: RankedFuture[];
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function occurrenceAgeDays(
  extractedAt: string | undefined,
  referenceTimeMs: number | null,
): number {
  // No reference time (timestamp-free ledger) or no timestamp on a row that
  // has one: mirror the decay semantics, where such occurrences carry full
  // weight — except that in a timestamped ledger, a row WITHOUT a timestamp
  // has unknowable recency and is treated as older history.
  if (referenceTimeMs === null) return 0;
  if (!extractedAt) return Number.POSITIVE_INFINITY;

  const time = Date.parse(extractedAt);
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;

  return Math.max(0, (referenceTimeMs - time) / MS_PER_DAY);
}

function computeWindowCounts(
  observations: LedgerObservation[],
  referenceTimeMs: number | null,
): Map<SignalSlug, SignalWindowCounts> {
  const counts = new Map<SignalSlug, SignalWindowCounts>();

  for (const observation of observations) {
    const ageDays = occurrenceAgeDays(observation.extractedAt, referenceTimeMs);

    for (const slug of observation.signals) {
      // Validity is delegated to the fold: only slugs that produced a
      // SignalState are read back out, so unknown slugs are harmless here.
      const entry = counts.get(slug as SignalSlug) ?? {
        recentCount: 0,
        previousCount: 0,
        olderCount: 0,
      };

      if (ageDays <= TREND_RECENT_WINDOW_DAYS) entry.recentCount += 1;
      else if (ageDays <= TREND_PREVIOUS_WINDOW_DAYS) entry.previousCount += 1;
      else entry.olderCount += 1;

      counts.set(slug as SignalSlug, entry);
    }
  }

  return counts;
}

function toAttributable(observation: LedgerObservation): AttributableObservation {
  return {
    id: observation.id,
    observation: observation.observation,
    signals: observation.signals,
    momentId: observation.momentId,
    // Titles belong to moments, which the brief must not inspect; the
    // attribution fields that echo them are not part of the brief.
    momentTitle: "",
    extractedAt: observation.extractedAt,
  };
}

/**
 * Builds the Identity Brief from Behavior Ledger rows (Layer 0). Pure and
 * deterministic: no AI, no wall clock, no I/O. See docs/identity-brief.md.
 */
export function buildIdentityBrief(observations: LedgerObservation[]): IdentityBrief {
  const snapshot = buildLedgerSnapshot(observations);
  const states = new Map(snapshot.signals.map((state) => [state.slug, state]));
  const windowCounts = computeWindowCounts(observations, snapshot.referenceTimeMs);

  // Trends for every evidenced signal (not just the top slice).
  const trends = new Map<SignalSlug, SignalTrend>();
  for (const state of snapshot.signals) {
    trends.set(
      state.slug,
      classifySignalTrend(
        windowCounts.get(state.slug) ?? { recentCount: 0, previousCount: 0, olderCount: 0 },
      ),
    );
  }

  // --- Recent changes (alphabetical within each group for determinism) ----
  const recentChanges: RecentChanges = {
    emerged: [],
    strengthened: [],
    weakened: [],
    dormant: [],
    returned: [],
  };
  for (const state of snapshot.signals) {
    const trend = trends.get(state.slug)!;
    if (trend !== "stable") recentChanges[trend].push(state.slug);
  }
  for (const group of Object.values(recentChanges)) group.sort();

  // --- Stability ----------------------------------------------------------
  const dormantCount = recentChanges.dormant.length;
  const activeSignalCount = snapshot.signals.length - dormantCount;
  const changingCount =
    recentChanges.emerged.length +
    recentChanges.strengthened.length +
    recentChanges.weakened.length +
    recentChanges.returned.length;
  const establishedCount = snapshot.signals.filter(
    (s) => s.stage === "established" || s.stage === "defining",
  ).length;

  let earliestMs: number | null = null;
  for (const observation of observations) {
    if (!observation.extractedAt) continue;
    const time = Date.parse(observation.extractedAt);
    if (Number.isNaN(time)) continue;
    if (earliestMs === null || time < earliestMs) earliestMs = time;
  }
  const evidenceSpanDays =
    snapshot.referenceTimeMs !== null && earliestMs !== null
      ? Math.round((snapshot.referenceTimeMs - earliestMs) / MS_PER_DAY)
      : null;

  const stabilityMetrics: IdentityStability["metrics"] = {
    totalObservations: snapshot.totalObservations,
    activeSignalCount,
    establishedShare:
      snapshot.signals.length === 0 ? 0 : establishedCount / snapshot.signals.length,
    changingShare: activeSignalCount === 0 ? 0 : changingCount / activeSignalCount,
    evidenceSpanDays,
  };
  const stability: IdentityStability = {
    ...deriveStability(stabilityMetrics),
    metrics: stabilityMetrics,
  };

  // --- Top signals with adaptive evidence budget --------------------------
  const maturity = profileMaturity(snapshot.totalObservations);
  const evidenceBudget = EVIDENCE_BUDGET[maturity];

  const topSignals: BriefSignal[] = snapshot.signals
    .slice(0, TOP_SIGNAL_LIMIT)
    .map((state) => ({
      signal: state.slug,
      stage: state.stage,
      trend: trends.get(state.slug)!,
      confidence: state.confidence,
      evidenceStrength: state.evidenceStrength,
      representativeEvidence: state.representativeEvidence.slice(0, evidenceBudget),
    }));

  // --- Summary metrics -----------------------------------------------------
  const breadth = new Set(observations.map((o) => o.momentId)).size;

  let newestSignal: SignalSlug | null = null;
  let newestFirstSeenMs: number | null = null;
  for (const state of snapshot.signals) {
    if (!state.firstSeenAt) continue;
    const time = Date.parse(state.firstSeenAt);
    if (Number.isNaN(time)) continue;
    if (
      newestFirstSeenMs === null ||
      time > newestFirstSeenMs ||
      (time === newestFirstSeenMs && newestSignal !== null && state.slug < newestSignal)
    ) {
      newestFirstSeenMs = time;
      newestSignal = state.slug;
    }
  }

  const summary: BriefSummaryMetrics = {
    totalObservations: snapshot.totalObservations,
    activeSignalCount,
    dormantSignalCount: dormantCount,
    breadth,
    strongestSignal: snapshot.signals[0]?.slug ?? null,
    newestSignal,
    evidenceSpanDays,
    maturity,
  };

  // --- Ranked futures -------------------------------------------------------
  // Reuses the product's deterministic recognition pipeline unchanged (the
  // brief delegates; it does not fork the scoring). v4.3: the engine's full
  // attribution is re-exposed — mapped field-for-field, computed nowhere
  // here. momentTitle is the one field dropped (G2: the brief never
  // inspects moments).
  const toEvidence = (obs: ObservationContribution): RankedFutureEvidence => ({
    observationId: obs.observationId,
    observation: obs.observationText,
    momentId: obs.momentId,
    contribution: obs.contribution,
  });

  const rankedFutures: RankedFuture[] = recognizeIdentitiesWithAttribution(
    observations.map(toAttributable),
  ).map((match: IdentityMatchWithAttribution) => ({
    identityId: match.identityId,
    canonicalName: match.canonicalName,
    score: match.score,
    likelihood: match.likelihood,
    confidence: match.confidence,
    evidenceStrength: match.evidenceStrength,
    matchedDimensions: match.matchedDimensions,
    supportingDimensions: match.dimensionBreakdown,
    opposingDimensions: match.opposingDimensions,
    supportingEvidence: match.supportingObservations.map(toEvidence),
    opposingEvidence: match.opposingObservations.map(toEvidence),
    supportingSituationCount: match.supportingSituationCount,
    supportingObservationCount: match.supportingObservationCount,
  }));

  return {
    behaviorEngineVersion: BEHAVIOR_ENGINE_VERSION,
    generatedAt:
      snapshot.referenceTimeMs === null
        ? null
        : new Date(snapshot.referenceTimeMs).toISOString(),
    topSignals,
    signalRelations: buildSignalRelations(states),
    stability,
    recentChanges,
    summary,
    rankedFutures,
  };
}
