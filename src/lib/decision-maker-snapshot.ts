import type {
  IdentityBrief,
  SignalTrend,
  StabilityBand,
} from "@/lib/identity-brief";
import type { SignalSlug } from "@/lib/behavior-signals";
import type { SignalStage } from "@/lib/behavior-ledger";
import type { FutureSelfEvidenceStrength } from "@/types/enums";

// Situations v3 — the "who is making this decision?" slice for path
// generation. A compact, structured projection of the Identity Brief: signal
// slugs, enums, and identity names only — no observation texts, no narrative
// prose, no previous AI output. The crossroad prompt receives this instead of
// the full brief so directions can be personal without flooding the context.

/** Top behavioral patterns included in the snapshot. */
const PATTERN_LIMIT = 6;

/** Top ranked future directions included in the snapshot. */
const DIRECTION_LIMIT = 3;

/** A tradeoff needs this much lopsided confidence before it says anything
 *  about how this person actually decides. */
const TRADEOFF_MIN_CONFIDENCE = 0.3;

/** Below this much ledger evidence the snapshot would be noise, not signal —
 *  matches the brief's own stability floor (STABILITY_MIN_OBSERVATIONS). */
const MIN_OBSERVATIONS = 5;

export type DecisionMakerSnapshot = {
  /** How settled this person's identity currently is. */
  stability: StabilityBand;
  /** Strongest behavioral patterns, strongest first. */
  strongestPatterns: {
    pattern: SignalSlug;
    stage: SignalStage;
    trend: SignalTrend;
  }[];
  /** Recurring tradeoffs: which side of each behavioral tension this
   *  person's evidence keeps favoring. */
  recurringTradeoffs: {
    leansToward: SignalSlug;
    awayFrom: SignalSlug;
  }[];
  /** Identities this person's life is already bending toward. */
  topDirections: {
    name: string;
    evidenceStrength: FutureSelfEvidenceStrength;
  }[];
};

/**
 * Projects the Identity Brief down to the stable facts a path generator needs
 * about the decision maker. Returns null when the ledger is too thin for the
 * projection to mean anything — callers then generate from the situation
 * alone, exactly as before.
 */
export function buildDecisionMakerSnapshot(
  brief: IdentityBrief,
): DecisionMakerSnapshot | null {
  if (brief.summary.totalObservations < MIN_OBSERVATIONS) {
    return null;
  }

  return {
    stability: brief.stability.band,
    strongestPatterns: brief.topSignals.slice(0, PATTERN_LIMIT).map((signal) => ({
      pattern: signal.signal,
      stage: signal.stage,
      trend: signal.trend,
    })),
    recurringTradeoffs: brief.signalRelations
      .filter(
        (relation) =>
          relation.dominant !== null &&
          relation.opposing !== null &&
          relation.confidence >= TRADEOFF_MIN_CONFIDENCE,
      )
      .map((relation) => ({
        leansToward: relation.dominant!,
        awayFrom: relation.opposing!,
      })),
    topDirections: brief.rankedFutures.slice(0, DIRECTION_LIMIT).map((future) => ({
      name: future.canonicalName,
      evidenceStrength: future.evidenceStrength,
    })),
  };
}
