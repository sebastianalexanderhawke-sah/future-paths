import type { DimensionScoreMap, IdentityDimension } from "@/types/behavior";

export const SIGNAL_SLUGS = [
  "chooses_solo_path",
  "seeks_collaboration",
  "asks_for_help",
  "starts_something_new",
  "journals_or_reflects",
  "adapts_to_feedback",
  "explores_new_topic",
  "follows_through_consistently",
  "takes_uncertain_risk",
  "shares_personal_struggle",
  "avoids_conflict",
  "sets_own_terms",
  "prioritizes_relationships",
  "self_corrects",
  "defers_to_others",
  "takes_deliberate_break",
  "questions_assumptions",
  "resists_change",
  "maintains_commitment",
  "opens_up_about_weakness",
  "engages_conflict_directly",
] as const;

export type SignalSlug = (typeof SIGNAL_SLUGS)[number];

export type SignalDefinition = {
  slug: SignalSlug;
  label: string;
  description: string;
  dimensions: { dimension: IdentityDimension; weight: number }[];
};

export const SIGNAL_DEFINITIONS: Record<SignalSlug, SignalDefinition> = {
  chooses_solo_path: {
    slug: "chooses_solo_path",
    label: "Chooses solo path",
    description:
      "Opted for a course of action that requires working alone rather than with others.",
    dimensions: [{ dimension: "Independence", weight: 2 }],
  },
  seeks_collaboration: {
    slug: "seeks_collaboration",
    label: "Seeks collaboration",
    description:
      "Actively looked for others to work with, share with, or build with.",
    dimensions: [{ dimension: "Connection", weight: 2 }],
  },
  asks_for_help: {
    slug: "asks_for_help",
    label: "Asks for help",
    description:
      "Reached out to another person for support, advice, or assistance.",
    dimensions: [
      { dimension: "Connection", weight: 1 },
      { dimension: "Vulnerability", weight: 2 },
    ],
  },
  starts_something_new: {
    slug: "starts_something_new",
    label: "Starts something new",
    description:
      "Initiated a new project, practice, habit, or direction without being asked.",
    dimensions: [{ dimension: "Initiative", weight: 2 }],
  },
  journals_or_reflects: {
    slug: "journals_or_reflects",
    label: "Journals or reflects",
    description:
      "Deliberately paused to examine their own thoughts, patterns, or choices.",
    dimensions: [{ dimension: "Reflection", weight: 2 }],
  },
  adapts_to_feedback: {
    slug: "adapts_to_feedback",
    label: "Adapts to feedback",
    description:
      "Changed approach after receiving new information, critique, or unexpected results.",
    dimensions: [{ dimension: "Adaptability", weight: 2 }],
  },
  explores_new_topic: {
    slug: "explores_new_topic",
    label: "Explores new topic",
    description:
      "Investigated, studied, or experimented with an unfamiliar subject or skill.",
    dimensions: [{ dimension: "Curiosity", weight: 2 }],
  },
  follows_through_consistently: {
    slug: "follows_through_consistently",
    label: "Follows through consistently",
    description:
      "Completed a commitment, habit, or responsibility over time without abandoning it.",
    dimensions: [{ dimension: "Consistency", weight: 2 }],
  },
  takes_uncertain_risk: {
    slug: "takes_uncertain_risk",
    label: "Takes uncertain risk",
    description:
      "Made a decision or action where the outcome was unclear and failure was possible.",
    dimensions: [{ dimension: "Risk Tolerance", weight: 2 }],
  },
  shares_personal_struggle: {
    slug: "shares_personal_struggle",
    label: "Shares personal struggle",
    description:
      "Disclosed something difficult, uncertain, or personally significant to another person.",
    dimensions: [{ dimension: "Vulnerability", weight: 2 }],
  },
  avoids_conflict: {
    slug: "avoids_conflict",
    label: "Avoids conflict",
    description:
      "Stepped back from or did not engage in a situation where disagreement was possible.",
    dimensions: [{ dimension: "Conflict Tolerance", weight: -1 }],
  },
  sets_own_terms: {
    slug: "sets_own_terms",
    label: "Sets own terms",
    description:
      "Defined the conditions of a situation rather than accepting the default offer or norm.",
    dimensions: [{ dimension: "Independence", weight: 1 }],
  },
  prioritizes_relationships: {
    slug: "prioritizes_relationships",
    label: "Prioritizes relationships",
    description:
      "Made a decision that put connection, friendship, or community ahead of other goals.",
    dimensions: [{ dimension: "Connection", weight: 2 }],
  },
  self_corrects: {
    slug: "self_corrects",
    label: "Self-corrects",
    description:
      "Recognized an error or misalignment and changed direction without external pressure.",
    dimensions: [
      { dimension: "Reflection", weight: 1 },
      { dimension: "Adaptability", weight: 1 },
    ],
  },
  defers_to_others: {
    slug: "defers_to_others",
    label: "Defers to others",
    description:
      "Let another person lead or decide rather than asserting their own preference.",
    dimensions: [{ dimension: "Independence", weight: -1 }],
  },
  takes_deliberate_break: {
    slug: "takes_deliberate_break",
    label: "Takes deliberate break",
    description:
      "Intentionally paused, rested, or stepped away from an ongoing commitment or demand.",
    dimensions: [{ dimension: "Reflection", weight: 1 }],
  },
  questions_assumptions: {
    slug: "questions_assumptions",
    label: "Questions assumptions",
    description:
      "Challenged an existing belief, pattern, or expectation — their own or someone else's.",
    dimensions: [
      { dimension: "Curiosity", weight: 1 },
      { dimension: "Reflection", weight: 1 },
    ],
  },
  resists_change: {
    slug: "resists_change",
    label: "Resists change",
    description:
      "Stayed with an existing approach or routine when an opportunity to shift arose.",
    dimensions: [{ dimension: "Adaptability", weight: -2 }],
  },
  maintains_commitment: {
    slug: "maintains_commitment",
    label: "Maintains commitment",
    description:
      "Continued with a responsibility or goal despite difficulty or competing pressure.",
    dimensions: [{ dimension: "Consistency", weight: 2 }],
  },
  opens_up_about_weakness: {
    slug: "opens_up_about_weakness",
    label: "Opens up about weakness",
    description: "Named or acknowledged a limitation, fear, or area of struggle openly.",
    dimensions: [{ dimension: "Vulnerability", weight: 2 }],
  },
  // Phase 8H: previously Conflict Tolerance could only be lowered
  // (avoids_conflict at -1) and never raised — the dimension was dead on the
  // positive side, leaving every identity that weights it starved. This is
  // the minimum signal that lets healthy conflict engagement register.
  engages_conflict_directly: {
    slug: "engages_conflict_directly",
    label: "Engages conflict directly",
    description:
      "Addressed a disagreement, confrontation, or unpopular position head-on rather than deferring or withdrawing.",
    dimensions: [{ dimension: "Conflict Tolerance", weight: 2 }],
  },
};

export const ALL_DIMENSIONS: IdentityDimension[] = [
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
];

export const EMPTY_DIMENSION_SCORES: DimensionScoreMap = {
  Independence: 0,
  Connection: 0,
  Initiative: 0,
  Reflection: 0,
  Adaptability: 0,
  Curiosity: 0,
  Consistency: 0,
  "Risk Tolerance": 0,
  Vulnerability: 0,
  "Conflict Tolerance": 0,
};

export function isValidSignalSlug(value: string): value is SignalSlug {
  return SIGNAL_SLUGS.includes(value as SignalSlug);
}

export function computeDimensionScores(signals: string[]): DimensionScoreMap {
  const scores = { ...EMPTY_DIMENSION_SCORES };

  for (const slug of signals) {
    if (!isValidSignalSlug(slug)) continue;
    for (const { dimension, weight } of SIGNAL_DEFINITIONS[slug].dimensions) {
      scores[dimension] += weight;
    }
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Time-aware evidence weighting
// ---------------------------------------------------------------------------
//
// Dimension scores were previously lifetime sums: every observation counted
// with full weight forever. Over years that makes scores grow without bound,
// pins every entrenched identity's likelihood near 100, and means a genuine
// change in behavior can never outweigh accumulated history — identity stops
// evolving.
//
// Strategy: exponential decay by evidence age, measured against the NEWEST
// observation in the ledger (not the wall clock), with a one-year half-life.
//
//   weight(obs) = 0.5 ^ (ageInDays / OBSERVATION_HALF_LIFE_DAYS)
//   ageInDays   = newest extracted_at − obs extracted_at
//
// Why these choices:
// - Exponential decay is the unique memoryless weighting: the relative weight
//   of two observations depends only on the time between them, never on when
//   the score is computed — so rankings shift smoothly, with no cliff where
//   evidence suddenly stops counting. Historical evidence always retains
//   some weight; it never reaches zero.
// - The half-life is one year because identity change in this product is
//   framed in seasons and years (life chapters, monthly narratives, yearly
//   evolution). One year of consistent new behavior carries the same total
//   weight as the entire preceding year — enough for real change to overtake
//   an established pattern in about a year — while three-year-old evidence
//   still contributes 1/8 weight, so long-standing patterns don't vanish.
//   It also bounds the steady-state score: for a user producing evidence at a
//   constant rate the decayed sum converges instead of growing forever, so
//   likelihood saturates at a level that reflects sustained recent behavior
//   rather than account age.
// - Anchoring "now" to the newest observation keeps scoring a deterministic
//   function of the ledger alone: the same observations always produce the
//   same scores, in tests and in production, and a returning user's evidence
//   is decayed relative to their own history rather than to their absence.
// - Observations without a timestamp keep full weight. This preserves exact
//   behavior for callers (and tests) that score plain signal lists, and is
//   the conservative choice for any legacy row missing extracted_at.

export const OBSERVATION_HALF_LIFE_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TimestampedSignals = {
  signals: string[];
  /** ISO timestamp (behavior_observations.extracted_at). Absent ⇒ full weight. */
  extractedAt?: string;
};

/**
 * The reference "now" for decay: the newest valid extractedAt across the
 * observations, in epoch ms. Null when no observation carries a timestamp
 * (in which case every observation gets full weight).
 */
export function observationReferenceTimeMs(
  observations: { extractedAt?: string }[],
): number | null {
  let newest: number | null = null;

  for (const observation of observations) {
    if (!observation.extractedAt) continue;
    const time = Date.parse(observation.extractedAt);
    if (Number.isNaN(time)) continue;
    if (newest === null || time > newest) {
      newest = time;
    }
  }

  return newest;
}

/**
 * The decay weight of one observation relative to the reference time.
 * Full weight (1) for the newest observation, halving every
 * OBSERVATION_HALF_LIFE_DAYS, never reaching zero. Observations without a
 * parseable timestamp get full weight.
 */
export function observationTimeWeight(
  extractedAt: string | undefined,
  referenceTimeMs: number | null,
): number {
  if (!extractedAt || referenceTimeMs === null) {
    return 1;
  }

  const time = Date.parse(extractedAt);
  if (Number.isNaN(time)) {
    return 1;
  }

  const ageDays = Math.max(0, (referenceTimeMs - time) / MS_PER_DAY);
  return Math.pow(0.5, ageDays / OBSERVATION_HALF_LIFE_DAYS);
}

export function computeDimensionScoresFromObservations(
  observations: TimestampedSignals[],
): DimensionScoreMap {
  const referenceTimeMs = observationReferenceTimeMs(observations);
  const scores = { ...EMPTY_DIMENSION_SCORES };

  for (const observation of observations) {
    const timeWeight = observationTimeWeight(observation.extractedAt, referenceTimeMs);

    for (const slug of observation.signals) {
      if (!isValidSignalSlug(slug)) continue;
      for (const { dimension, weight } of SIGNAL_DEFINITIONS[slug].dimensions) {
        scores[dimension] += weight * timeWeight;
      }
    }
  }

  return scores;
}
