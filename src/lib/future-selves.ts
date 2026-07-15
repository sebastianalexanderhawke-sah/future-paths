import { randomUUID } from "crypto";

import {
  extractAndPersistBehaviorObservations,
  extractAndPersistCheckInObservations,
  type CheckInObservationSource,
} from "@/lib/behavior-extraction";
import {
  explainIdentities,
  explainIdentitiesFromBrief,
  needsExplanationRegeneration,
  type IdentityExplanationResult,
} from "@/lib/ai/explain-identity";
import {
  getFutureSelvesEngine,
  isFutureSelvesShadowCompareEnabled,
  selectFuturesFromBrief,
  type RecognizedFutureInput,
} from "@/lib/future-selves-brief";
import {
  composeFutureSelfChangeRows,
  type FutureSelfChangeRow,
} from "@/lib/future-self-changes";
import { getIdentityById } from "@/lib/identity-library";
import {
  recognizeIdentitiesWithAttribution,
  type AttributableObservation,
} from "@/lib/identity-recognition";
import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import { reportError, swallowReporting } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { FutureSelf, FutureSelfEvent } from "@/types/database";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated." };
  }

  return { userId: user.id };
}

export async function listFutureSelves(options?: {
  status?: FutureSelf["status"];
  limit?: number;
}): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  let query = supabase
    .from("future_selves")
    .select("*")
    .eq("user_id", auth.userId)
    // Future Selves always come from the Identity Engine — legacy
    // AI-discovered rows (identity_id null, from the pre-Identity-Engine
    // trajectory system) are never surfaced, regardless of status.
    .not("identity_id", "is", null)
    .order("percentage", { ascending: false })
    .order("updated_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { futureSelves: data };
}

export async function listActiveFutureSelves(
  limit = MAX_FUTURE_SELVES,
): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  return listFutureSelves({ status: "active", limit });
}

/**
 * Every recorded event (emerged / grew / faded / returned) for this user's
 * Future Selves, oldest first, grouped by future_self_id — the raw material
 * for telling each future's evolution story. A plain object (not a Map) so
 * it can cross the server→client component boundary.
 */
export async function loadFutureSelfEventsByFutureSelf(): Promise<
  Record<string, FutureSelfEvent[]>
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return {};
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("future_self_events")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: true });

  const byFutureSelf: Record<string, FutureSelfEvent[]> = {};
  for (const event of data ?? []) {
    (byFutureSelf[event.future_self_id] ??= []).push(event);
  }
  return byFutureSelf;
}

/**
 * The Overview's What's Changed rows, read entirely from future_self_events
 * inside the recency window — movement stays visible for the whole window
 * instead of only until the next generation run. Aggregation (one row per
 * future, lifecycle precedence, grew/weakened netting, decay-step
 * exclusion) lives in composeFutureSelfChangeRows. Legacy rows without an
 * identity_id never surface, matching every other Future Self read.
 */
export async function getRecentFutureSelfChanges(
  windowMs: number,
): Promise<FutureSelfChangeRow[]> {
  const auth = await requireUser();
  if ("error" in auth) {
    return [];
  }

  const supabase = await createClient();
  const since = new Date(Date.now() - windowMs).toISOString();

  const [{ data: events }, { data: rows }] = await Promise.all([
    supabase
      .from("future_self_events")
      .select("future_self_id, event_type, percentage_before, percentage_after, created_at")
      .eq("user_id", auth.userId)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("future_selves")
      .select("id, name, status")
      .eq("user_id", auth.userId)
      .not("identity_id", "is", null),
  ]);

  return composeFutureSelfChangeRows(events ?? [], rows ?? []);
}

export type FutureSelfImpactEntry = {
  futureSelfId: string;
  name: string;
  eventType: FutureSelfEvent["event_type"];
  percentageBefore: number;
  percentageAfter: number;
  delta: number;
};

// future_self_events carries no link back to the path that caused it — a
// generation can also run after a check-in or reflection — so "the impact of
// this path choice" can't be reconstructed exactly. The closest deterministic
// proxy is the first batch of events recorded right after this path's
// chosen_at and before the next path was chosen: since a single
// generateFutureSelves() call writes all of its events back-to-back, events
// less than this far apart belong to the same run.
const FUTURE_SELF_IMPACT_RUN_GAP_MS = 10_000;

/** Splits timestamp-ordered rows into runs, starting a new one whenever the gap exceeds the threshold. */
function clusterByRun<T extends { created_at: string }>(rows: T[], gapMs: number): T[][] {
  const runs: T[][] = [];
  let current: T[] | null = null;
  let lastTime = 0;

  for (const row of rows) {
    const time = new Date(row.created_at).getTime();
    if (current && time - lastTime <= gapMs) {
      current.push(row);
    } else {
      current = [row];
      runs.push(current);
    }
    lastTime = time;
  }

  return runs;
}

/**
 * For every chosen path, returns the Future Self percentage movement from
 * the generation that ran immediately after it was chosen (and before the
 * next path was chosen), keyed by path id. Only futures that actually moved
 * are included — a future left untouched by a generation produces no event
 * at all, so this never fabricates a zero-impact entry.
 */
export async function loadFutureSelfImpactByPath(): Promise<Map<string, FutureSelfImpactEntry[]>> {
  const auth = await requireUser();
  if ("error" in auth) {
    return new Map();
  }

  const supabase = await createClient();

  const [{ data: pathRows }, { data: eventRows }, { data: futureSelfRows }] = await Promise.all([
    supabase
      .from("paths")
      .select("id, chosen_at")
      .eq("user_id", auth.userId)
      .eq("is_chosen", true)
      .order("chosen_at", { ascending: true }),
    supabase
      .from("future_self_events")
      .select("future_self_id, event_type, percentage_before, percentage_after, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: true }),
    supabase.from("future_selves").select("id, name").eq("user_id", auth.userId),
  ]);

  const chosenPaths = (pathRows ?? []).filter(
    (path): path is { id: string; chosen_at: string } => path.chosen_at !== null,
  );
  const events = eventRows ?? [];
  const nameById = new Map((futureSelfRows ?? []).map((row) => [row.id, row.name]));
  const impactByPath = new Map<string, FutureSelfImpactEntry[]>();

  chosenPaths.forEach((path, index) => {
    const windowStart = path.chosen_at;
    const windowEnd = chosenPaths[index + 1]?.chosen_at ?? null;

    const eventsInWindow = events.filter(
      (event) =>
        event.created_at >= windowStart && (windowEnd === null || event.created_at < windowEnd),
    );

    const [firstRun] = clusterByRun(eventsInWindow, FUTURE_SELF_IMPACT_RUN_GAP_MS);
    if (!firstRun) return;

    const entries = firstRun
      .map((event) => ({
        futureSelfId: event.future_self_id,
        name: nameById.get(event.future_self_id) ?? "A future self",
        eventType: event.event_type,
        percentageBefore: event.percentage_before ?? 0,
        percentageAfter: event.percentage_after,
        delta: event.percentage_after - (event.percentage_before ?? 0),
      }))
      .filter((entry) => entry.delta !== 0)
      .sort((a, b) => b.delta - a.delta);

    if (entries.length > 0) {
      impactByPath.set(path.id, entries);
    }
  });

  return impactByPath;
}

async function recordFutureSelfEvent(input: {
  userId: string;
  futureSelfId: string;
  eventType: "emerged" | "grew" | "weakened" | "faded" | "returned";
  percentageBefore: number | null;
  percentageAfter: number;
  summary: string;
}) {
  const supabase = await createClient();

  await supabase.from("future_self_events").insert({
    user_id: input.userId,
    future_self_id: input.futureSelfId,
    event_type: input.eventType,
    percentage_before: input.percentageBefore,
    percentage_after: input.percentageAfter,
    summary: input.summary,
  });
}

/**
 * Phase 4 display band: at least 3 and at most 5 active Future Selves,
 * sorted by likelihood. The evidence-tier count ceiling is retired — the
 * percentage communicates confidence and is not an admission bar. The floor
 * is best-effort: a future is never fabricated to hit it (see the
 * minLikelihood-0 re-run in generateFutureSelves), so an account whose
 * evidence grounds fewer than 3 identities surfaces fewer.
 */
export const MIN_FUTURE_SELVES = 3;
export const MAX_FUTURE_SELVES = 5;

// ---------------------------------------------------------------------------
// Gradual fade
// ---------------------------------------------------------------------------
//
// Leaving the recognized set used to zero a future in a single run — a
// selection-boundary wobble (or a library update) rendered as a "-30%" cliff
// that read as the identity model collapsing, when the user's evidence had
// barely moved. Instead, an unmatched active future now thins by
// FADE_DECAY_FACTOR per generation run and only completes its fade (status
// "faded", percentage 0 — the same terminal state as before) once it has
// thinned below FADE_COMPLETE_THRESHOLD. While it is thinning, percentage
// and previous_percentage move together so the decay never renders as an
// evidence-driven score drop; the recorded faded events carry the decline
// for the evolution story.

export const FADE_DECAY_FACTOR = 0.5;
export const FADE_COMPLETE_THRESHOLD = 10;

/**
 * One generation run's fade progression for an unmatched active future:
 * either it thins to a lower (still displayed) percentage, or it has grown
 * too thin to keep and completes the fade.
 */
export function nextFadeStep(
  percentage: number,
): { kind: "declining"; percentage: number } | { kind: "complete" } {
  const decayed = Math.round(percentage * FADE_DECAY_FACTOR);
  return decayed >= FADE_COMPLETE_THRESHOLD
    ? { kind: "declining", percentage: decayed }
    : { kind: "complete" };
}

/**
 * Identifies the lived-evidence event that triggered a generation run, so
 * step 1 can extract behavior observations from it. A check-in trigger
 * extracts from the check-in's reflection; a reflection_answer trigger
 * extracts from the answered reflection Q&A on that check-in.
 */
export type FutureSelvesGenerationTrigger = {
  checkInId: string;
  source: CheckInObservationSource;
};

/**
 * Extracts decision-time behavior observations for the triggering moment if
 * none exist yet (idempotent per moment). This is part of step 1 of
 * generateFutureSelves, and is also run on the lock-timeout path so a
 * trigger's evidence is never lost even when the recognition/persistence
 * phase is skipped — extraction only appends to behavior_observations and
 * never touches future_selves rows.
 */
async function ensureBehaviorObservationsForMoment(
  userId: string,
  momentId: string,
): Promise<"extracted" | "skipped"> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("behavior_observations")
    .select("id")
    .eq("moment_id", momentId)
    .eq("user_id", userId)
    .eq("source_type", "situation_complete")
    .limit(1);

  if (existing?.length) {
    return "skipped";
  }

  await extractAndPersistBehaviorObservations(userId, momentId).catch(
    swallowReporting("future-selves: behavior observation extraction failed", {
      userId,
      momentId,
    }),
  );
  return "extracted";
}

/**
 * Extracts lived-evidence observations for a specific (check-in, source) pair
 * if none exist yet — exactly one extraction per check-in and one per
 * answered reflection, guaranteed by the check_in_id + source_type existence
 * check. This is what makes check-ins and reflection answers actually move
 * Future Selves: before this, the ledger only ever received decision-time
 * evidence, so regeneration recomputed identical scores.
 */
async function ensureCheckInObservations(
  userId: string,
  trigger: FutureSelvesGenerationTrigger,
): Promise<"extracted" | "skipped"> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("behavior_observations")
    .select("id")
    .eq("check_in_id", trigger.checkInId)
    .eq("source_type", trigger.source)
    .eq("user_id", userId)
    .limit(1);

  if (existing?.length) {
    return "skipped";
  }

  await extractAndPersistCheckInObservations(userId, trigger.checkInId, trigger.source).catch(
    () => {},
  );
  return "extracted";
}

/**
 * New pipeline: Situation → Behavior Extraction → Behavior Ledger →
 * Dimension Scores → Identity Recognition → Identity Attribution →
 * AI Explanation → Future Self persistence.
 *
 * Identity recognition is fully deterministic (no AI). AI is called once per
 * recognized identity solely to generate why_emerging, growth_opportunities,
 * blind_spots, and likely_evolution — all numerical values and labels come
 * exclusively from the Identity Platform.
 *
 * @param momentId - When provided, behavior observations are extracted for
 *   this moment before recognition runs (skipped if already extracted).
 */
/**
 * Development-only (FUTURE_SELVES_SHADOW_COMPARE=true): after a brief-mode
 * selection, run the legacy recognition path read-only and log a numeric
 * side-by-side. The deterministic layers are equal by construction (the
 * brief's rankedFutures ARE the recognition output; pinned by tests) — this
 * log verifies it end-to-end on live accounts and surfaces the evidence each
 * mode would hand the narrative prompt. No AI call, no persistence, never
 * throws, never runs in production.
 */
async function runFutureSelvesShadowComparison(
  userId: string,
  recognized: RecognizedFutureInput[],
): Promise<void> {
  if (!isFutureSelvesShadowCompareEnabled()) {
    return;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("behavior_observations")
      .select("id, observation, signals, moment_id, extracted_at, moments(title)")
      .eq("user_id", userId)
      .order("extracted_at", { ascending: true });

    if (!data?.length) {
      return;
    }

    const observations: AttributableObservation[] = data.map((row) => ({
      id: row.id,
      observation: row.observation,
      signals: row.signals,
      momentId: row.moment_id,
      momentTitle: (row.moments as { title: string } | null)?.title ?? "Untitled situation",
      extractedAt: row.extracted_at ?? undefined,
    }));

    const legacyMatches = recognizeIdentitiesWithAttribution(observations);
    const legacyTop =
      legacyMatches.length >= MIN_FUTURE_SELVES
        ? legacyMatches.slice(0, MAX_FUTURE_SELVES)
        : recognizeIdentitiesWithAttribution(observations, {
            minLikelihood: 0,
            maxResults: MIN_FUTURE_SELVES,
          });

    const summarize = (items: { identityId: string; likelihood: number; confidence: number; evidenceStrength: string; supportingObservations: unknown[] }[]) =>
      items.map((item) => ({
        identityId: item.identityId,
        likelihood: item.likelihood,
        confidence: item.confidence,
        evidenceStrength: item.evidenceStrength,
        supportingEvidenceCount: item.supportingObservations.length,
      }));

    console.log(
      `[future-selves-shadow] ${JSON.stringify({
        brief: summarize(recognized),
        legacy: summarize(legacyTop),
      })}`,
    );
  } catch {
    // Shadow comparison must never affect the primary generation.
  }
}

export async function generateFutureSelves(
  momentId?: string,
  trigger?: FutureSelvesGenerationTrigger,
): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();

  // Step 1: Extract behavior for the triggering moment if not yet done.
  if (momentId) {
    await ensureBehaviorObservationsForMoment(auth.userId, momentId);
  }

  // Step 1b: Lived evidence. When this run was triggered by a check-in or an
  // answered reflection, extract observations from it (once per check-in and
  // once per answered reflection — the (check_in_id, source_type) guard makes
  // this idempotent). This is the step that turns lived experience into
  // evidence the recognition engine can actually see.
  if (trigger) {
    await ensureCheckInObservations(auth.userId, trigger);
  }

  // Steps 2–4: obtain this run's recognized futures. Brief mode (Behavior
  // Engine v4, phase 5) reads the shared Identity Brief and never touches
  // raw observations or the recognition engine; the legacy path below stays
  // byte-for-byte as the reversible migration boundary
  // (FUTURE_SELVES_ENGINE=legacy) and as the automatic fallback for accounts
  // the brief can't serve (see selectFuturesFromBrief).
  let engine: "brief" | "legacy";
  try {
    engine = getFutureSelvesEngine();
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Future Selves engine is misconfigured.",
    };
  }

  let recognized: RecognizedFutureInput[] | null = null;
  let usedEngine: "brief" | "legacy" = "legacy";

  if (engine === "brief") {
    const selection = await selectFuturesFromBrief({
      supabase,
      userId: auth.userId,
      maxCount: MAX_FUTURE_SELVES,
    });

    if (selection.kind === "empty") {
      // No observations yet — leave existing active futures untouched
      // (identical to the legacy early return).
      return listFutureSelves({ status: "active" });
    }

    if (selection.kind === "ok") {
      recognized = selection.recognized;
      usedEngine = "brief";
      await runFutureSelvesShadowComparison(auth.userId, recognized);
    }
    // selection.kind === "fallback": the legacy path below handles it —
    // sub-threshold accounts need the minimum-count recognition re-run the
    // brief cannot express, and a brief read failure must not block
    // generation.
  }

  if (!recognized) {
    // ---- Legacy path (pre-phase-5, unchanged) ----

    // Step 2: Load all behavior observations for this user, joined with moment titles.
    const { data: rawObservations, error: obsError } = await supabase
      .from("behavior_observations")
      .select("id, observation, signals, moment_id, extracted_at, moments(title)")
      .eq("user_id", auth.userId)
      .order("extracted_at", { ascending: true });

    if (obsError) {
      return { error: obsError.message };
    }

    // No observations yet — leave existing active futures untouched.
    if (!rawObservations?.length) {
      return listFutureSelves({ status: "active" });
    }

    // Step 3: Build AttributableObservation array for the recognition engine.
    const observations: AttributableObservation[] = rawObservations.map((row) => ({
      id: row.id,
      observation: row.observation,
      signals: row.signals,
      momentId: row.moment_id,
      momentTitle: (row.moments as { title: string } | null)?.title ?? "Untitled situation",
      extractedAt: row.extracted_at ?? undefined,
    }));

    // Step 4: Deterministic identity recognition — no AI involved.
    const recognizedIdentities = recognizeIdentitiesWithAttribution(observations);

    // The Identity Engine is the sole source of Future Selves — never fall
    // back to legacy rows. Phase 4 band: up to MAX_FUTURE_SELVES (5) distinct
    // dominant traits, at least MIN_FUTURE_SELVES (3) when the evidence can
    // ground them. When fewer than three identities clear the normal
    // threshold, ask the same, unmodified engine for its top three regardless
    // of threshold instead of fabricating anything: those matches are still
    // evidence-grounded, their sub-threshold likelihoods already label them
    // "Emerging", and if fewer identities have any positive evidence at all,
    // only those are surfaced — the three-minimum never invents a life the
    // evidence doesn't support.
    const topIdentities =
      recognizedIdentities.length >= MIN_FUTURE_SELVES
        ? recognizedIdentities.slice(0, MAX_FUTURE_SELVES)
        : recognizeIdentitiesWithAttribution(observations, {
            minLikelihood: 0,
            maxResults: MIN_FUTURE_SELVES,
          });

    recognized = topIdentities.map((match) => ({
      identityId: match.identityId,
      likelihood: match.likelihood,
      confidence: match.confidence,
      evidenceStrength: match.evidenceStrength,
      dimensionBreakdown: match.dimensionBreakdown,
      supportingObservations: match.supportingObservations,
      supportingSituations: match.supportingSituations,
      opposingObservations: match.opposingObservations,
      narrative: { kind: "legacy", match },
    }));
  }

  // Step 5: Load existing future_selves rows for continuity matching.
  const { data: existingRows, error: existingError } = await supabase
    .from("future_selves")
    .select("*")
    .eq("user_id", auth.userId);

  if (existingError) {
    return { error: existingError.message };
  }

  const allExisting = existingRows ?? [];

  // Step 6: Resolve identity profiles for all recognized identities, and pair
  // each with its existing row (if any) so the regeneration decision below
  // can see whether this identity has ever been persisted before the AI call
  // goes out.
  const entries = recognized.flatMap((input) => {
    const profile = getIdentityById(input.identityId);
    if (!profile) return [];

    // Match first by identity_id (new-pipeline rows), then by a retired
    // epoch's id (see IdentityProfile.legacy_ids — a library update must
    // never read as an identity disappearing), then by canonical or legacy
    // name (legacy rows that happen to share a name this identity has ever
    // displayed under — see IdentityProfile.legacy_names).
    const existing =
      allExisting.find((r) => r.identity_id === input.identityId) ??
      allExisting.find(
        (r) =>
          r.identity_id !== null &&
          (profile.legacy_ids?.includes(r.identity_id) ?? false),
      ) ??
      allExisting.find(
        (r) =>
          !r.identity_id &&
          (r.name === profile.canonical_name ||
            profile.legacy_names?.includes(r.name)),
      );

    return [
      {
        input,
        profile,
        existing,
        // canonical_name detects rename epochs (a row still carrying an old
        // name gets its personalization rewritten once — the update below
        // renames the row in the same run); short_description detects the
        // not-yet-personalized state.
        decision: needsExplanationRegeneration(
          existing,
          input.evidenceStrength,
          profile.canonical_name,
          profile.short_description,
        ),
      },
    ];
  });

  // Step 6b: the AI's only output is the personalized layer (the "why now"
  // summary sentence and the why_emerging evidence bullets) — the card copy
  // itself is permanent library editorial. It is invoked only for identities
  // with no existing row, rows holding a fallback awaiting repair, rows
  // carrying a pre-rename name, rows never personalized, and rows whose
  // evidence tier increased (see needsExplanationRegeneration). Everything
  // else keeps its stored personalization; percentage, evidence, and
  // supporting data update below regardless of this decision.
  // A run is engine-homogeneous: brief mode invokes the brief-based prompt
  // builder, legacy mode the original one (its []-call is preserved so the
  // no-regeneration case behaves exactly as before phase 5).
  const entriesNeedingRegeneration = entries.filter((e) => e.decision.regenerate);
  let explanationResults: IdentityExplanationResult[];
  if (usedEngine === "brief") {
    explanationResults = await explainIdentitiesFromBrief(
      entriesNeedingRegeneration.flatMap(({ input, profile }) =>
        input.narrative.kind === "brief" ? [{ profile, future: input.narrative.future }] : [],
      ),
    );
  } else {
    explanationResults = await explainIdentities(
      entriesNeedingRegeneration.flatMap(({ input, profile }) =>
        input.narrative.kind === "legacy" ? [{ profile, match: input.narrative.match }] : [],
      ),
    );
  }
  const explanationById = new Map(explanationResults.map((r) => [r.identityId, r]));

  const now = new Date().toISOString();
  // Track which existing row IDs were matched this run (for fading unmatched rows).
  const matchedRowIds = new Set<string>();
  let hasMeaningfulTransition = false;

  // Step 7: Persist each identity.
  for (const { input, profile, existing, decision } of entries) {
    // Regenerated identities use the fresh AI personalization; unchanged
    // ones carry their stored sentence and evidence bullets — only
    // percentage, evidence, and supporting data are refreshed below
    // regardless.
    const regenerated = decision.regenerate
      ? explanationById.get(input.identityId)
      : undefined;

    const percentage = input.likelihood;
    const evidenceStrength = input.evidenceStrength;

    // Provenance travels with the personalization: written only when it is
    // (re)written, so an untouched personalization keeps the source and
    // evidence tier it was originally authored at. A fallback source makes
    // the next run repair it; the recorded tier is what a later run compares
    // against to detect a tier increase.
    const narrativeProvenanceFields = regenerated
      ? {
          narrative_source: regenerated.source ?? "ai",
          narrative_evidence_strength: evidenceStrength,
        }
      : {};

    const attributionFields = {
      identity_id: input.identityId,
      confidence: input.confidence,
      dimension_breakdown: input.dimensionBreakdown as unknown as Record<string, unknown>[],
      supporting_observations: input.supportingObservations as unknown as Record<string, unknown>[],
      supporting_situations: input.supportingSituations as unknown as Record<string, unknown>[],
      opposing_observations: input.opposingObservations as unknown as Record<string, unknown>[],
    };

    // The becomes / strengthens / tradeoffs sections are permanent library
    // editorial, written from the library on EVERY run (a copy edit reaches
    // every row without regeneration). The AI contributes exactly two
    // fields: the "why now" sentence (persisted in summary) and the
    // why_emerging evidence bullets. A stored summary equal to the library
    // description is the not-yet-personalized state — see
    // needsExplanationRegeneration.
    const curated = profile.curated_narrative;
    const carriedSummary =
      existing?.summary && existing.summary !== profile.short_description
        ? existing.summary
        : null;
    const personalizedSummary =
      regenerated?.explanation.personalized_summary ?? carriedSummary;
    const whyEmerging = regenerated
      ? regenerated.explanation.why_emerging
      : existing!.why_emerging;

    const contentFields = {
      name: profile.canonical_name,
      summary: personalizedSummary ?? profile.short_description,
      evidence_strength: evidenceStrength,
      // core_behaviors carries the library's canonical behaviors for this identity.
      core_behaviors: profile.typical_behaviors,
      // behavioral_evidence carries the user's actual supporting observations.
      behavioral_evidence: input.supportingObservations.map((o) => o.observationText),
      why_emerging: whyEmerging,
      growth_opportunities: [...curated.strengthens],
      blind_spots: [...curated.tradeoffs],
      likely_evolution: curated.becomes.join("\n"),
      // Untyped empty literal — infers never[], which satisfies ThemeName[]
      // (the old `as string[]` assertion failed the build's type check).
      themes: [],
      ...narrativeProvenanceFields,
    };

    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from("future_selves")
        .insert({
          user_id: auth.userId,
          percentage,
          status: "active",
          ...contentFields,
          ...attributionFields,
        })
        .select("*")
        .single();

      if (insertError || !created) {
        return { error: insertError?.message ?? "Failed to create future self." };
      }

      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: created.id,
        eventType: "emerged",
        percentageBefore: null,
        percentageAfter: percentage,
        summary: `${profile.canonical_name} may be emerging from your patterns.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    matchedRowIds.add(existing.id);

    // A row matched under a different key — a retired epoch's id or a
    // name-matched legacy row — is being re-keyed to this identity. Its
    // percentage moves from the old epoch's value onto this run's freshly
    // computed likelihood, which is a technical migration, not a change in
    // the user's evidence: the trend must read flat and no grew event may be
    // recorded for this run.
    const remapped = existing.identity_id !== input.identityId;

    if (existing.status === "faded") {
      const { error: updateError } = await supabase
        .from("future_selves")
        .update({
          percentage,
          previous_percentage: existing.percentage,
          status: "active",
          updated_at: now,
          ...contentFields,
          ...attributionFields,
        })
        .eq("id", existing.id)
        .eq("user_id", auth.userId);

      if (updateError) {
        return { error: updateError.message };
      }

      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: existing.id,
        eventType: "returned",
        percentageBefore: existing.percentage,
        percentageAfter: percentage,
        summary: `${profile.canonical_name} may be returning as your patterns shift.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    // Active future — always snapshot previous_percentage for trend tracking.
    const percentageIncreased = percentage > existing.percentage;
    const percentageDecreased = percentage < existing.percentage;
    const evidenceStrengthChanged = evidenceStrength !== existing.evidence_strength;

    const { error: updateError } = await supabase
      .from("future_selves")
      .update({
        percentage,
        previous_percentage: remapped ? percentage : existing.percentage,
        updated_at: now,
        ...contentFields,
        ...attributionFields,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId);

    if (updateError) {
      return { error: updateError.message };
    }

    if (percentageIncreased && !remapped) {
      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: existing.id,
        eventType: "grew",
        percentageBefore: existing.percentage,
        percentageAfter: percentage,
        summary: `${profile.canonical_name} may be gaining strength.`,
      });
    }

    // The decline counterpart of "grew": a matched active future whose
    // likelihood decreased. Remaps stay silent for the same reason they
    // record no grew event — a re-keyed epoch is a migration, not evidence.
    if (percentageDecreased && !remapped) {
      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: existing.id,
        eventType: "weakened",
        percentageBefore: existing.percentage,
        percentageAfter: percentage,
        summary: `${profile.canonical_name} may be losing strength.`,
      });
    }

    if (evidenceStrengthChanged) {
      hasMeaningfulTransition = true;
    }
  }

  // Step 8: Gradually fade every active future that was not matched this
  // run (see nextFadeStep — never straight to 0% in a single run).
  for (const existing of allExisting) {
    if (existing.status !== "active" || matchedRowIds.has(existing.id)) {
      continue;
    }

    const step = nextFadeStep(existing.percentage);

    if (step.kind === "declining") {
      const { error: declineError } = await supabase
        .from("future_selves")
        .update({
          percentage: step.percentage,
          // Both percentage fields move together: the decay is a lifecycle
          // step, not an evidence-driven score change, so the trend reads
          // flat everywhere a delta would otherwise render.
          previous_percentage: step.percentage,
          updated_at: now,
        })
        .eq("id", existing.id)
        .eq("user_id", auth.userId);

      if (declineError) {
        return { error: declineError.message };
      }

      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: existing.id,
        eventType: "faded",
        percentageBefore: existing.percentage,
        percentageAfter: step.percentage,
        summary: `${existing.name} may be fading for now.`,
      });

      // Still active — Current Self regeneration waits for the fade to
      // complete.
      continue;
    }

    const { error: fadeError } = await supabase
      .from("future_selves")
      .update({
        status: "faded",
        percentage: 0,
        previous_percentage: existing.percentage,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId);

    if (fadeError) {
      return { error: fadeError.message };
    }

    await recordFutureSelfEvent({
      userId: auth.userId,
      futureSelfId: existing.id,
      eventType: "faded",
      percentageBefore: existing.percentage,
      percentageAfter: 0,
      summary: `${existing.name} may be fading for now.`,
    });

    hasMeaningfulTransition = true;
  }


  if (hasMeaningfulTransition) {
    await requestCurrentSelfRegeneration(auth.userId);
  }

  return listFutureSelves({ status: "active" });
}

const GENERATION_LOCK_TTL_SECONDS = 120;
const GENERATION_LOCK_MAX_WAIT_MS = 10_000;
const GENERATION_LOCK_POLL_MS = 250;
// Renew at a third of the TTL so a generation that outlives its initial lease
// keeps the lock (mutual exclusion cannot lapse mid-run), while a crashed
// holder is still reclaimable within one TTL.
const GENERATION_LOCK_RENEW_MS = (GENERATION_LOCK_TTL_SECONDS * 1000) / 3;

// Cross-instance serialization. The in-process Map below still coalesces
// triggers within a single Node process (the common case), but a Map cannot
// serialize across separate application instances. This advisory lock — a row
// per user in future_selves_generation_locks, acquired and released via RPC —
// is the authoritative guarantee that two instances handling the same user
// never run generateFutureSelves() concurrently. A dead holder's lease expires
// and is reclaimed automatically, so a crashed instance cannot permanently
// deadlock a user's generation. While generation runs, the lease is renewed on
// a heartbeat (acquire is re-entrant for the current holder), so a run longer
// than the TTL never loses the lock. The generation pipeline itself is
// untouched.
async function generateFutureSelvesWithCrossInstanceLock(
  userId: string,
  momentId?: string,
  trigger?: FutureSelvesGenerationTrigger,
): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  const supabase = await createClient();
  const holder = randomUUID();
  const deadline = Date.now() + GENERATION_LOCK_MAX_WAIT_MS;
  let acquired = false;

  for (;;) {
    const { data } = await supabase.rpc("acquire_future_selves_lock", {
      p_holder: holder,
      p_ttl_seconds: GENERATION_LOCK_TTL_SECONDS,
    });
    if (data === true) {
      acquired = true;
      break;
    }
    if (Date.now() >= deadline) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, GENERATION_LOCK_POLL_MS));
  }

  if (!acquired) {
    // Fail closed: another instance is generating for this user right now, and
    // running the pipeline without the lock would interleave two generations'
    // future_selves writes — the exact race the lock exists to prevent. The
    // trigger's evidence is still captured (extraction is idempotent and never
    // touches future_selves rows), so the next generation run includes it;
    // only the recognition/persistence phase is deferred.
    if (momentId) {
      await ensureBehaviorObservationsForMoment(userId, momentId);
    }
    if (trigger) {
      await ensureCheckInObservations(userId, trigger);
    }
    return {
      error: "A Future Selves update is already in progress. Please try again in a moment.",
    };
  }

  // Heartbeat: re-acquiring with the same holder token extends the lease.
  const renewTimer = setInterval(() => {
    void supabase
      .rpc("acquire_future_selves_lock", {
        p_holder: holder,
        p_ttl_seconds: GENERATION_LOCK_TTL_SECONDS,
      })
      .then(
        () => {},
        (error) => {
          // Best-effort renewal; the next tick retries. Reported because a
          // persistently failing heartbeat means mutual exclusion can lapse
          // mid-generation once the lease expires.
          void reportError("future-selves: generation lock renewal failed", error, {
            userId,
          });
        },
      );
  }, GENERATION_LOCK_RENEW_MS);

  try {
    return await generateFutureSelves(momentId, trigger);
  } finally {
    clearInterval(renewTimer);
    try {
      await supabase.rpc("release_future_selves_lock", { p_holder: holder });
    } catch (error) {
      // Best-effort release; the lease also expires on its own.
      await reportError("future-selves: generation lock release failed", error, {
        userId,
      });
    }
  }
}

// Serializes Future Selves generation per user. Every trigger (choosing a path,
// submitting a check-in, answering a reflection, the manual refresh action)
// calls this instead of generateFutureSelves() directly. The in-process chain
// keeps same-instance triggers ordered; the cross-instance advisory lock inside
// generateFutureSelvesWithCrossInstanceLock() extends that guarantee across
// every instance. Overlapping triggers (e.g. two path choices seconds apart, or
// a background run still in flight when another fires) run one after another
// against a consistent view of the user's future_selves rows, instead of
// racing. Different users are never serialized against each other.
const inFlightGenerationByUser = new Map<string, Promise<unknown>>();

export async function queueFutureSelvesGeneration(
  momentId?: string,
  trigger?: FutureSelvesGenerationTrigger,
): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  // The two bare catches below are chain plumbing, not swallowed failures:
  // a previous run's failure was already delivered to (and reported by) its
  // own caller, and this run's failure propagates through the returned `run`
  // promise to the current caller. Catching here only prevents an unhandled
  // rejection on the internally retained chain.
  const previous = inFlightGenerationByUser.get(auth.userId) ?? Promise.resolve();
  const run = previous
    .catch(() => {})
    .then(() => generateFutureSelvesWithCrossInstanceLock(auth.userId, momentId, trigger));

  inFlightGenerationByUser.set(auth.userId, run);
  run
    .catch(() => {})
    .finally(() => {
      if (inFlightGenerationByUser.get(auth.userId) === run) {
        inFlightGenerationByUser.delete(auth.userId);
      }
    });

  return run;
}
