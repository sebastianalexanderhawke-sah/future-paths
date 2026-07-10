import { IdentityEngineConfigError } from "@/lib/ai/config";
import { getIdentityBriefForUser } from "@/lib/identity-brief-source";
import type { IdentityBrief, RankedFuture } from "@/lib/identity-brief";
import type {
  DimensionContribution,
  IdentityMatchWithAttribution,
  ObservationContribution,
  SituationContribution,
} from "@/lib/identity-recognition";
import type { createClient } from "@/lib/supabase/server";
import type { FutureSelfEvidenceStrength } from "@/types/enums";

// ---------------------------------------------------------------------------
// Behavior Engine v4 — Phase 5: Future Selves migration boundary
// ---------------------------------------------------------------------------
//
// Everything specific to brief-based Future Selves that is NOT the pipeline
// itself: the engine flag, and the selection step that turns the shared
// Identity Brief's rankedFutures into the pipeline's normalized inputs.
// Consumer rule: this module selects, filters, and relabels brief data —
// it never runs recognition, folds observations, or computes attribution.

// ---------------------------------------------------------------------------
// Engine flag
// ---------------------------------------------------------------------------

export type FutureSelvesEngine = "brief" | "legacy";

/**
 * Which pipeline selects and grounds Future Selves. Defaults to the Identity
 * Brief; FUTURE_SELVES_ENGINE=legacy reverts to the direct recognition
 * pipeline wholesale. A present-but-unrecognized value throws rather than
 * silently picking an engine (same policy as CURRENT_SELF_ENGINE).
 *
 * Independent of the flag, generation falls back to legacy for accounts
 * where fewer than two identities clear the brief's ranking threshold: the
 * two-minimum policy asks recognition for its top two REGARDLESS of
 * threshold, which requires recognition options the brief does not expose.
 */
export function getFutureSelvesEngine(): FutureSelvesEngine {
  const raw = process.env.FUTURE_SELVES_ENGINE?.trim();

  if (!raw) {
    return "brief";
  }

  if (raw === "brief" || raw === "legacy") {
    return raw;
  }

  throw new IdentityEngineConfigError(
    `Invalid FUTURE_SELVES_ENGINE "${raw}". Expected "brief" or "legacy".`,
  );
}

/**
 * Development-only shadow comparison: brief-mode generation also runs legacy
 * recognition (read-only, no AI, no persistence) and logs a numeric diff.
 * Never enabled in production.
 */
export function isFutureSelvesShadowCompareEnabled(): boolean {
  return (
    process.env.FUTURE_SELVES_SHADOW_COMPARE?.trim() === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

// ---------------------------------------------------------------------------
// Normalized pipeline input
// ---------------------------------------------------------------------------

/**
 * What the persistence pipeline needs per recognized identity, shaped
 * identically by both engines so continuity matching, regeneration
 * decisions, and the persist loop are mode-agnostic. The narrative
 * discriminator carries the mode-specific payload for the AI call.
 */
export type RecognizedFutureInput = {
  identityId: string;
  likelihood: number;
  confidence: number;
  evidenceStrength: FutureSelfEvidenceStrength;
  dimensionBreakdown: DimensionContribution[];
  supportingObservations: ObservationContribution[];
  supportingSituations: SituationContribution[];
  opposingObservations: ObservationContribution[];
  narrative:
    | { kind: "legacy"; match: IdentityMatchWithAttribution }
    | { kind: "brief"; future: RankedFuture };
};

export type FutureSelvesSelection =
  | { kind: "empty" }
  | { kind: "fallback"; reason: "brief_unavailable" | "below_two_minimum" }
  | { kind: "ok"; recognized: RecognizedFutureInput[]; brief: IdentityBrief };

const MIN_SELECTED_FUTURES = 2;

/**
 * Brief-mode selection: reads the shared Identity Brief, applies the same
 * evidence-follows-count policy the legacy path uses (injected, so the
 * policy lives in exactly one place), and normalizes the selected futures
 * for the shared pipeline.
 *
 * Situation titles: the persisted attribution (supporting_observations /
 * supporting_situations) is user-visible — the Future Card's "grounded in"
 * evidence and the evolution story read momentTitle from it. Titles are
 * presentation labels, not identity input: they are looked up here for the
 * momentIds the brief exposed, attached to the persisted rows, and NEVER
 * enter the narrative prompt (explainIdentitiesFromBrief reads only brief
 * fields).
 */
export async function selectFuturesFromBrief(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  /** The legacy evidence-tier count policy (maxFutureSelvesForEvidence). */
  maxCount: (matches: readonly { evidenceStrength: FutureSelfEvidenceStrength }[]) => number;
}): Promise<FutureSelvesSelection> {
  const { supabase, userId, maxCount } = input;

  const briefResult = await getIdentityBriefForUser(supabase, userId);

  if (!briefResult.ok) {
    return { kind: "fallback", reason: "brief_unavailable" };
  }

  if (briefResult.observationCount === 0) {
    return { kind: "empty" };
  }

  const ranked = briefResult.brief.rankedFutures;

  if (ranked.length < MIN_SELECTED_FUTURES) {
    return { kind: "fallback", reason: "below_two_minimum" };
  }

  const selected = ranked.slice(0, maxCount(ranked));
  const titles = await loadMomentTitles(supabase, userId, selected);

  return {
    kind: "ok",
    brief: briefResult.brief,
    recognized: selected.map((future) => toRecognizedInput(future, titles)),
  };
}

async function loadMomentTitles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  selected: RankedFuture[],
): Promise<Map<string, string>> {
  const momentIds = [
    ...new Set(
      selected.flatMap((future) => [
        ...(future.supportingEvidence ?? []).map((e) => e.momentId),
        ...(future.opposingEvidence ?? []).map((e) => e.momentId),
      ]),
    ),
  ];

  const titles = new Map<string, string>();
  if (momentIds.length === 0) {
    return titles;
  }

  const { data } = await supabase
    .from("moments")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", momentIds);

  for (const moment of data ?? []) {
    titles.set(moment.id, moment.title);
  }
  return titles;
}

const UNTITLED = "Untitled situation";

function toObservationContribution(
  evidence: NonNullable<RankedFuture["supportingEvidence"]>[number],
  titles: Map<string, string>,
): ObservationContribution {
  return {
    observationId: evidence.observationId,
    observationText: evidence.observation,
    momentId: evidence.momentId,
    momentTitle: titles.get(evidence.momentId) ?? UNTITLED,
    contribution: evidence.contribution,
  };
}

function toRecognizedInput(
  future: RankedFuture,
  titles: Map<string, string>,
): RecognizedFutureInput {
  const supportingObservations = (future.supportingEvidence ?? []).map((evidence) =>
    toObservationContribution(evidence, titles),
  );
  const opposingObservations = (future.opposingEvidence ?? []).map((evidence) =>
    toObservationContribution(evidence, titles),
  );

  // Situation grouping: a per-situation VIEW of the brief's top supporting
  // evidence, in the evidence's own strongest-first order — this feeds the
  // Future Card's "grounded in" titles. It intentionally differs from the
  // legacy engine's supportingSituations (which aggregates every observation,
  // not just the exposed top 5); re-exposing the engine's own list through
  // the brief is the v4.4 recommendation that removes this grouping.
  const situationMap = new Map<string, SituationContribution>();
  for (const observation of supportingObservations) {
    const existing = situationMap.get(observation.momentId);
    if (existing) {
      existing.contribution += observation.contribution;
      existing.observationCount += 1;
    } else {
      situationMap.set(observation.momentId, {
        momentId: observation.momentId,
        momentTitle: observation.momentTitle,
        contribution: observation.contribution,
        observationCount: 1,
      });
    }
  }

  return {
    identityId: future.identityId,
    likelihood: future.likelihood,
    confidence: future.confidence,
    evidenceStrength: future.evidenceStrength,
    dimensionBreakdown: future.supportingDimensions ?? [],
    supportingObservations,
    supportingSituations: [...situationMap.values()],
    opposingObservations,
    narrative: { kind: "brief", future },
  };
}
