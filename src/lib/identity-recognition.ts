import type { DimensionScoreMap, IdentityDimension } from "@/types/behavior";
import type { FutureSelfEvidenceStrength } from "@/types/enums";
import {
  computeDimensionScoresFromObservations,
  EMPTY_DIMENSION_SCORES,
  isValidSignalSlug,
  SIGNAL_DEFINITIONS,
  type SignalSlug,
} from "@/lib/behavior-signals";
import {
  getIdentityById,
  IDENTITY_LIBRARY,
  type IdentityDimensionWeights,
  type IdentityProfile,
} from "@/lib/identity-library";

// ---------------------------------------------------------------------------
// Core match type (no attribution)
// ---------------------------------------------------------------------------

export type IdentityMatch = {
  identityId: string;
  canonicalName: string;
  score: number;
  likelihood: number;
  matchedDimensions: IdentityDimension[];
  evidenceStrength: FutureSelfEvidenceStrength;
};

// ---------------------------------------------------------------------------
// Attribution types
// ---------------------------------------------------------------------------

/**
 * An observation enriched with the moment context needed to produce
 * situation-level attribution. The caller joins behavior_observations with
 * moments before passing to recognizeIdentitiesWithAttribution.
 */
export type AttributableObservation = {
  id: string;
  observation: string;
  signals: string[];
  momentId: string;
  momentTitle: string;
  /** ISO timestamp — used to determine recency for confidence. Preserves
   *  array order when absent. */
  extractedAt?: string;
};

/** How much a single identity dimension contributed to the match score. */
export type DimensionContribution = {
  dimension: IdentityDimension;
  /** The identity library weight for this dimension. */
  identityWeight: number;
  /** The user's aggregated score for this dimension. */
  userScore: number;
  /** identityWeight × userScore — the actual contribution to the raw score. */
  contribution: number;
};

/** How much a single observation contributed to the match score. */
export type ObservationContribution = {
  observationId: string;
  observationText: string;
  momentId: string;
  momentTitle: string;
  /** Sum of (identityWeight[d] × signalWeight) for every signal in this
   *  observation across every dimension it touches. */
  contribution: number;
};

/** Aggregated contribution of a single situation (moment) to the match. */
export type SituationContribution = {
  momentId: string;
  momentTitle: string;
  /** Sum of all observation contributions from this moment. */
  contribution: number;
  /** Number of observations that came from this moment. */
  observationCount: number;
};

/** IdentityMatch extended with full attribution and confidence data. */
export type IdentityMatchWithAttribution = IdentityMatch & {
  /** Certainty in the match given evidence quantity, consistency, and recency.
   *  Independent of likelihood: high likelihood + low confidence means the
   *  pattern fits well but rests on few observations. */
  confidence: number;
  /** Dimensions with a positive net contribution, sorted descending. */
  dimensionBreakdown: DimensionContribution[];
  /** Dimensions with a negative net contribution, sorted ascending (most
   *  negative first). */
  opposingDimensions: DimensionContribution[];
  /** Up to 5 observations that contributed most positively. */
  supportingObservations: ObservationContribution[];
  /** Up to 3 observations that contributed most negatively. */
  opposingObservations: ObservationContribution[];
  /** Up to 5 situations (moments) with the highest total positive contribution. */
  supportingSituations: SituationContribution[];
};

// ---------------------------------------------------------------------------
// Scoring helpers (shared by both pipelines)
// ---------------------------------------------------------------------------

// Maps a raw weighted score to a 0-100 likelihood using the same harmonic
// formula as scoreToIdentityLikelihood in future-selves.ts. The scale
// constant sets the midpoint: a raw score equal to SCALE produces 50%.
// With dimension weights in the 0.5–1.0 range and per-signal weights of
// 1–2, a score of 50 represents roughly 15–25 aligned observations — the
// point where a pattern is plausible but not yet established.
const RECOGNITION_LIKELIHOOD_SCALE = 50;

export function scoreToLikelihood(rawScore: number): number {
  if (rawScore <= 0) return 0;
  return Math.min(
    100,
    Math.max(1, Math.round((100 * rawScore) / (rawScore + RECOGNITION_LIKELIHOOD_SCALE))),
  );
}

function evidenceStrengthFromLikelihood(likelihood: number): FutureSelfEvidenceStrength {
  if (likelihood >= 60) return "Strong";
  if (likelihood >= 30) return "Moderate";
  return "Emerging";
}

// Computes the weighted dot product of the identity's dimension weights and
// the user's current dimension scores. A positive weight means "this identity
// is more likely when this dimension is active"; a negative weight means
// "this identity is less likely when this dimension is active."
// Dimensions missing from the identity's weights contribute 0.
function computeWeightedScore(
  userDimensions: DimensionScoreMap,
  weights: IdentityDimensionWeights,
): number {
  let score = 0;
  for (const [dimension, weight] of Object.entries(weights) as [IdentityDimension, number][]) {
    score += weight * (userDimensions[dimension] ?? 0);
  }
  return score;
}

// Returns the dimensions that are contributing positively to this match —
// where the identity has a positive weight AND the user has evidence in that
// direction. Sorted by contribution magnitude descending so the most
// meaningful signals appear first.
function computeMatchedDimensions(
  userDimensions: DimensionScoreMap,
  weights: IdentityDimensionWeights,
): IdentityDimension[] {
  return (Object.entries(weights) as [IdentityDimension, number][])
    .filter(([dimension, weight]) => weight > 0 && (userDimensions[dimension] ?? 0) > 0)
    .sort(
      ([dimA, wA], [dimB, wB]) =>
        wB * (userDimensions[dimB] ?? 0) - wA * (userDimensions[dimA] ?? 0),
    )
    .map(([dimension]) => dimension);
}

function scoreIdentity(
  identity: IdentityProfile,
  userDimensions: DimensionScoreMap,
): IdentityMatch {
  const score = computeWeightedScore(userDimensions, identity.dimension_weights);
  const likelihood = scoreToLikelihood(score);
  const matchedDimensions = computeMatchedDimensions(userDimensions, identity.dimension_weights);
  const evidenceStrength = evidenceStrengthFromLikelihood(likelihood);

  return {
    identityId: identity.id,
    canonicalName: identity.canonical_name,
    score,
    likelihood,
    matchedDimensions,
    evidenceStrength,
  };
}

// ---------------------------------------------------------------------------
// Attribution helpers
// ---------------------------------------------------------------------------

/**
 * Computes how much a single observation's signals contribute to a specific
 * identity's score. Traces each signal → dimension → identity weight and sums
 * the products. This is the per-observation analogue of computeWeightedScore,
 * disaggregated to the individual signal level.
 *
 * Mathematically: for every signal s in the observation, for every
 * (dimension d, signalWeight sw) that s maps to, contribution += iw[d] × sw.
 * Summing across all observations recovers the same total as computeWeightedScore
 * because dimension scores are themselves sums of per-signal weights.
 */
function computeObservationContribution(
  signals: string[],
  identityWeights: IdentityDimensionWeights,
): number {
  let contribution = 0;

  for (const slug of signals) {
    if (!isValidSignalSlug(slug)) continue;
    const def = SIGNAL_DEFINITIONS[slug as SignalSlug];

    for (const { dimension, weight: signalWeight } of def.dimensions) {
      contribution += (identityWeights[dimension] ?? 0) * signalWeight;
    }
  }

  return contribution;
}

/**
 * Splits the identity's dimension profile into supporting (positive
 * contribution) and opposing (negative contribution) entries.
 */
function buildDimensionBreakdowns(
  userDimensions: DimensionScoreMap,
  weights: IdentityDimensionWeights,
): { dimensionBreakdown: DimensionContribution[]; opposingDimensions: DimensionContribution[] } {
  const dimensionBreakdown: DimensionContribution[] = [];
  const opposingDimensions: DimensionContribution[] = [];

  for (const [dim, identityWeight] of Object.entries(weights) as [IdentityDimension, number][]) {
    const userScore = userDimensions[dim] ?? 0;
    const contribution = identityWeight * userScore;
    if (contribution === 0) continue;

    const entry: DimensionContribution = { dimension: dim, identityWeight, userScore, contribution };

    if (contribution > 0) {
      dimensionBreakdown.push(entry);
    } else {
      opposingDimensions.push(entry);
    }
  }

  dimensionBreakdown.sort((a, b) => b.contribution - a.contribution);
  opposingDimensions.sort((a, b) => a.contribution - b.contribution); // most negative first

  return { dimensionBreakdown, opposingDimensions };
}

// ---------------------------------------------------------------------------
// Confidence calculation
// ---------------------------------------------------------------------------

// Coverage saturates at this many aligned observations — beyond this point,
// additional observations shift quality (consistency, recency) but not the
// coverage factor. 15 is calibrated so that ~5 well-directed observations
// produce ~33% confidence and ~50+ produce near-ceiling confidence.
const CONFIDENCE_OBSERVATION_SATURATION = 15;

// Situation diversity saturates at this many distinct moments. Multiple
// situations producing aligned observations is stronger evidence than the
// same number of observations from a single situation.
const CONFIDENCE_SITUATION_SATURATION = 8;

// Recency window: the most recent N observations are examined separately to
// detect whether the pattern is continuing or fading.
const CONFIDENCE_RECENCY_WINDOW = 10;

type ConfidenceInputs = {
  totalObservations: number;
  supportingCount: number;
  opposingCount: number;
  recentSupportCount: number;
  recentWindowSize: number;
  uniqueSituationCount: number;
};

/**
 * Computes a 0-100 confidence score that answers "how certain is the system
 * given the accumulated evidence?"
 *
 * Distinct from likelihood (which answers "how well does the profile fit?"):
 *   - High likelihood + low confidence → strong pattern, few observations
 *   - High confidence + moderate likelihood → weaker fit, but years of data
 *
 * Formula:
 *   coverageFactor = blend of observation coverage and situation diversity
 *   qualityFactor  = weighted blend of consistency and recency, discounted
 *                    by the fraction of contradictory observations
 *   confidence     = round(coverageFactor × qualityFactor × 100)
 */
export function computeConfidence(inputs: ConfidenceInputs): number {
  const {
    totalObservations,
    supportingCount,
    opposingCount,
    recentSupportCount,
    recentWindowSize,
    uniqueSituationCount,
  } = inputs;

  if (totalObservations === 0) return 0;

  // How many observations and situations have accumulated?
  const observationCoverage = Math.min(1, supportingCount / CONFIDENCE_OBSERVATION_SATURATION);
  const situationDiversity = Math.min(1, uniqueSituationCount / CONFIDENCE_SITUATION_SATURATION);
  // Blend: observations dominate (70%), situations refine (30%).
  const coverageFactor = observationCoverage * 0.7 + situationDiversity * 0.3;

  // What fraction of all observations are aligned with this identity?
  const consistencyRatio = supportingCount / totalObservations;

  // What fraction of recent observations are aligned?
  const recentFactor =
    recentWindowSize === 0 ? consistencyRatio : recentSupportCount / recentWindowSize;

  // How many opposing observations reduce confidence?
  // Capped at 0.4 so even extremely contradictory evidence leaves some signal.
  const contradictionPenalty = Math.min(0.4, opposingCount / totalObservations);

  // Blend consistency (60%) and recency (40%), then discount for contradictions.
  const qualityFactor =
    (consistencyRatio * 0.6 + recentFactor * 0.4) * (1 - contradictionPenalty);

  return Math.round(Math.max(0, Math.min(100, coverageFactor * qualityFactor * 100)));
}

// ---------------------------------------------------------------------------
// Full attribution builder
// ---------------------------------------------------------------------------

function buildAttribution(
  baseMatch: IdentityMatch,
  identity: IdentityProfile,
  observations: AttributableObservation[],
  userDimensions: DimensionScoreMap,
): IdentityMatchWithAttribution {
  const weights = identity.dimension_weights;

  // Sort observations chronologically so the recency window is stable.
  const sorted = [...observations].sort((a, b) => {
    if (!a.extractedAt && !b.extractedAt) return 0;
    if (!a.extractedAt) return -1;
    if (!b.extractedAt) return 1;
    return a.extractedAt < b.extractedAt ? -1 : 1;
  });

  // Per-observation contributions.
  const withContrib = sorted.map((obs) => ({
    obs,
    contribution: computeObservationContribution(obs.signals, weights),
  }));

  const supportingCount = withContrib.filter((x) => x.contribution > 0).length;
  const opposingCount = withContrib.filter((x) => x.contribution < 0).length;

  const recentWindow = withContrib.slice(-CONFIDENCE_RECENCY_WINDOW);
  const recentSupportCount = recentWindow.filter((x) => x.contribution > 0).length;

  const uniqueSituationCount = new Set(observations.map((o) => o.momentId)).size;

  const confidence = computeConfidence({
    totalObservations: observations.length,
    supportingCount,
    opposingCount,
    recentSupportCount,
    recentWindowSize: recentWindow.length,
    uniqueSituationCount,
  });

  // Dimension-level breakdown.
  const { dimensionBreakdown, opposingDimensions } = buildDimensionBreakdowns(
    userDimensions,
    weights,
  );

  // Top supporting observations.
  const supportingObservations: ObservationContribution[] = withContrib
    .filter((x) => x.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5)
    .map(({ obs, contribution }) => ({
      observationId: obs.id,
      observationText: obs.observation,
      momentId: obs.momentId,
      momentTitle: obs.momentTitle,
      contribution,
    }));

  // Top opposing observations.
  const opposingObservations: ObservationContribution[] = withContrib
    .filter((x) => x.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution) // most negative first
    .slice(0, 3)
    .map(({ obs, contribution }) => ({
      observationId: obs.id,
      observationText: obs.observation,
      momentId: obs.momentId,
      momentTitle: obs.momentTitle,
      contribution,
    }));

  // Situation-level aggregation.
  const situationMap = new Map<
    string,
    { title: string; contribution: number; observationCount: number }
  >();

  for (const { obs, contribution } of withContrib) {
    const existing = situationMap.get(obs.momentId);
    if (existing) {
      existing.contribution += contribution;
      existing.observationCount += 1;
    } else {
      situationMap.set(obs.momentId, {
        title: obs.momentTitle,
        contribution,
        observationCount: 1,
      });
    }
  }

  const supportingSituations: SituationContribution[] = [...situationMap.entries()]
    .filter(([, data]) => data.contribution > 0)
    .sort(([, a], [, b]) => b.contribution - a.contribution)
    .slice(0, 5)
    .map(([momentId, data]) => ({
      momentId,
      momentTitle: data.title,
      contribution: data.contribution,
      observationCount: data.observationCount,
    }));

  return {
    ...baseMatch,
    confidence,
    dimensionBreakdown,
    opposingDimensions,
    supportingObservations,
    opposingObservations,
    supportingSituations,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type RecognitionOptions = {
  minLikelihood?: number;
  maxResults?: number;
};

const DEFAULT_MIN_LIKELIHOOD = 10;
const DEFAULT_MAX_RESULTS = 5;

/**
 * Scores every identity in the library against the user's current dimension
 * profile, filters below the minimum likelihood threshold, and returns
 * matches ranked by raw score descending. No AI call, no prose, no side
 * effects. Pure application logic.
 */
export function recognizeIdentities(
  userDimensions: DimensionScoreMap,
  options: RecognitionOptions = {},
): IdentityMatch[] {
  const minLikelihood = options.minLikelihood ?? DEFAULT_MIN_LIKELIHOOD;
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;

  return IDENTITY_LIBRARY.map((identity) => scoreIdentity(identity, userDimensions))
    .filter((match) => match.likelihood >= minLikelihood)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Full attributed recognition pipeline.
 *
 * Runs the same scoring as recognizeIdentities, then augments every match
 * with per-dimension contributions, per-observation contributions, per-
 * situation contributions, and a confidence score. Requires enriched
 * observations (with moment context) rather than a pre-aggregated dimension
 * map.
 *
 * No AI call. No prose. No side effects.
 */
export function recognizeIdentitiesWithAttribution(
  observations: AttributableObservation[],
  options: RecognitionOptions = {},
): IdentityMatchWithAttribution[] {
  const userDimensions = computeDimensionScoresFromObservations(observations);
  const baseMatches = recognizeIdentities(userDimensions, options);

  return baseMatches.map((match) => {
    const identity = getIdentityById(match.identityId)!;
    return buildAttribution(match, identity, observations, userDimensions);
  });
}

/**
 * Convenience entry point that runs the basic recognition pipeline from raw
 * observations. Computes dimension scores first, then calls recognizeIdentities.
 */
export function recognizeIdentitiesFromObservations(
  observations: { signals: string[] }[],
  options: RecognitionOptions = {},
): IdentityMatch[] {
  const userDimensions = computeDimensionScoresFromObservations(observations);
  return recognizeIdentities(userDimensions, options);
}

/**
 * Returns the empty dimension profile — useful as a fallback when a user
 * has no observations yet and recognition cannot run.
 */
export function emptyDimensionProfile(): DimensionScoreMap {
  return { ...EMPTY_DIMENSION_SCORES };
}
