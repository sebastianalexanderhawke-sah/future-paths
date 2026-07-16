import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import {
  currentSelfFromBriefNullableOutputSchema,
  currentSelfNullableOutputSchema,
} from "@/lib/ai/schemas/current-self";
import { extractAndPersistCheckInObservations } from "@/lib/behavior-extraction";
import {
  compareCurrentSelfDrafts,
  deriveThemesFromBrief,
  getCurrentSelfEngine,
  isCurrentSelfShadowCompareEnabled,
  type CurrentSelfEngine,
} from "@/lib/current-self-brief";
import {
  deriveFearsFromThemes,
  deriveValuesFromThemes,
} from "@/lib/current-self-inference";
import { getIdentityBriefForUser } from "@/lib/identity-brief-source";
import type { MockCurrentSelfDraft } from "@/lib/mock-current-self-generator";
import {
  reportDiscardedResultError,
  swallowReporting,
} from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { CurrentSelf } from "@/types/database";

// Legacy rows — created before these columns existed, or read through a
// partially-applied migration — can come back from Supabase with values,
// afraid_of_becoming, core_tension, themes, or recent_growth missing
// entirely rather than defaulted to '[]'/''. Every field this module
// touches is normalized here before anything iterates over it. The return
// type narrows values/afraid_of_becoming/core_tension to non-null so the
// rest of this file never needs another null check on them.
type NormalizedCurrentSelf = CurrentSelf & {
  values: string[];
  afraid_of_becoming: string[];
  core_tension: string;
};

function normalizeCurrentSelf(row: CurrentSelf): NormalizedCurrentSelf {
  return {
    ...row,
    themes: row.themes ?? [],
    values: row.values ?? [],
    afraid_of_becoming: row.afraid_of_becoming ?? [],
    core_tension: row.core_tension ?? "",
    core_tradeoff: row.core_tradeoff ?? "",
    recent_growth: row.recent_growth ?? [],
  };
}

// Backfills "What You Value" / "What You Fear Becoming" for rows generated
// before those fields existed, or where generation returned them empty —
// derived from the same theme evidence already on the record, never
// persisted, so a real regeneration always supersedes it. Normalizes first,
// so a legacy row missing these columns entirely never crashes here.
function withInferredValuesAndFears(row: CurrentSelf): NormalizedCurrentSelf {
  const currentSelf = normalizeCurrentSelf(row);

  if (currentSelf.values.length > 0 && currentSelf.afraid_of_becoming.length > 0) {
    return currentSelf;
  }

  return {
    ...currentSelf,
    values:
      currentSelf.values.length > 0
        ? currentSelf.values
        : deriveValuesFromThemes(currentSelf.themes),
    afraid_of_becoming:
      currentSelf.afraid_of_becoming.length > 0
        ? currentSelf.afraid_of_becoming
        : deriveFearsFromThemes(currentSelf.themes),
  };
}

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

const CURRENT_SELF_PREREQUISITE_ERROR =
  "Current Self needs at least one moment, one check-in, and one active Future Self.";

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

export async function getCurrentSelf(): Promise<
  { currentSelf: CurrentSelf | null } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("current_self")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  return { currentSelf: data ? withInferredValuesAndFears(data) : data };
}

type GenerationInput =
  | {
      momentCount: number;
      checkInCount: number;
      activeFutureSelfCount: number;
    }
  | { error: string };

async function loadGenerationInput(userId: string): Promise<GenerationInput> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  // Prerequisite gating only needs counts. The previous version also read the
  // full paths/check_ins/identity_updates tables and discarded the rows — the
  // context builder loads what generation actually uses.
  const [
    { count: momentCount, error: momentError },
    { count: checkInCount, error: checkInCountError },
    { count: activeFutureSelfCount, error: futuresError },
  ] = await Promise.all([
    supabase
      .from("moments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("future_selves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  if (momentError || checkInCountError || futuresError) {
    return {
      error:
        momentError?.message ??
        checkInCountError?.message ??
        futuresError?.message ??
        "Failed to load history.",
    };
  }

  return {
    momentCount: momentCount ?? 0,
    checkInCount: checkInCount ?? 0,
    activeFutureSelfCount: activeFutureSelfCount ?? 0,
  };
}

export type GenerateCurrentSelfInput = {
  reflection?: {
    question: string;
    answer: string;
    checkInReflection: string;
    momentTitle: string;
    /** The check-in the answer was written on. Brief mode uses it to make
     *  sure the answer's observations are in the ledger before the brief is
     *  built (extraction is idempotent per check-in and source). */
    checkInId?: string;
  };
};

type CurrentSelfDraftResult =
  | { ok: true; draft: MockCurrentSelfDraft | null }
  | { ok: false; error: string };

/** The pre-phase-4 pipeline, byte-for-byte: raw context profile, v10 prompt.
 *  Kept intact as the reversible migration boundary (CURRENT_SELF_ENGINE=
 *  legacy) and as the automatic fallback for empty ledgers. */
async function generateLegacyCurrentSelfDraft(
  userId: string,
  reflectionInput?: GenerateCurrentSelfInput,
): Promise<CurrentSelfDraftResult> {
  const reflection = reflectionInput?.reflection;

  const generationResult = await runStructuredGeneration({
    userId,
    profile: "current_self",
    promptId: "current_self.generate",
    schema: currentSelfNullableOutputSchema,
    // checkInId is brief-mode metadata — strip it so the legacy prompt's
    // serialized context stays identical to what it was before phase 4.
    overrides: reflection
      ? {
          reflectionQA: {
            question: reflection.question,
            answer: reflection.answer,
            checkInReflection: reflection.checkInReflection,
            momentTitle: reflection.momentTitle,
          },
        }
      : undefined,
  });

  if (!generationResult.ok) {
    return { ok: false, error: generationResult.error };
  }

  return { ok: true, draft: generationResult.data };
}

/**
 * Behavior Engine v4 (phase 4): the brief-based pipeline. The prompt receives
 * ONLY the Identity Brief; themes are derived deterministically from the same
 * brief. Returns `fallbackToLegacy` when the ledger holds no observations —
 * extraction failures and mock-mode accounts (mock extraction produces no
 * observations) keep generating exactly as before this migration.
 */
async function generateBriefCurrentSelfDraft(
  userId: string,
  reflectionInput?: GenerateCurrentSelfInput,
): Promise<CurrentSelfDraftResult | { fallbackToLegacy: true }> {
  const supabase = await createClient();

  // Sequencing (audit gap G4): this regeneration may be reacting to a
  // just-answered reflection whose extraction normally runs later, inside
  // Future Selves generation. Run it first (idempotent per check-in/source)
  // so the answer's evidence is in the ledger the brief is built from.
  const checkInId = reflectionInput?.reflection?.checkInId;
  if (checkInId) {
    const { data: existing } = await supabase
      .from("behavior_observations")
      .select("id")
      .eq("check_in_id", checkInId)
      .eq("source_type", "reflection_answer")
      .eq("user_id", userId)
      .limit(1);

    if (!existing?.length) {
      await extractAndPersistCheckInObservations(
        userId,
        checkInId,
        "reflection_answer",
      ).catch(
        swallowReporting("generateCurrentSelf: reflection extraction failed", {
          userId,
          checkInId,
        }),
      );
    }
  }

  const briefResult = await getIdentityBriefForUser(supabase, userId);

  if (!briefResult.ok || briefResult.observationCount === 0) {
    return { fallbackToLegacy: true };
  }

  const { brief } = briefResult;

  const generationResult = await runStructuredGeneration({
    userId,
    profile: "current_self_brief",
    promptId: "current_self.generate_from_brief",
    schema: currentSelfFromBriefNullableOutputSchema,
    overrides: { identityBrief: brief },
  });

  if (!generationResult.ok) {
    return { ok: false, error: generationResult.error };
  }

  if (!generationResult.data) {
    return { ok: true, draft: null };
  }

  return {
    ok: true,
    draft: { ...generationResult.data, themes: deriveThemesFromBrief(brief) },
  };
}

/**
 * Development-only shadow comparison (CURRENT_SELF_SHADOW_COMPARE=true):
 * generates the other engine's draft for the same user, logs a structural
 * diff plus both drafts, and discards the result. Never runs in production,
 * never persists anything, never throws.
 */
async function runCurrentSelfShadowComparison(
  userId: string,
  primaryEngine: CurrentSelfEngine,
  primaryDraft: MockCurrentSelfDraft,
  reflectionInput?: GenerateCurrentSelfInput,
): Promise<void> {
  if (!isCurrentSelfShadowCompareEnabled()) {
    return;
  }

  try {
    let legacyDraft: MockCurrentSelfDraft;
    let briefDraft: MockCurrentSelfDraft;

    if (primaryEngine === "brief") {
      const shadow = await generateLegacyCurrentSelfDraft(userId, reflectionInput);
      if (!shadow.ok || !shadow.draft) return;
      legacyDraft = shadow.draft;
      briefDraft = primaryDraft;
    } else {
      const shadow = await generateBriefCurrentSelfDraft(userId, reflectionInput);
      if ("fallbackToLegacy" in shadow || !shadow.ok || !shadow.draft) return;
      legacyDraft = primaryDraft;
      briefDraft = shadow.draft;
    }

    // The drafts are the user's identity portrait — prose derived from their
    // private reflections. This comparison log is dev-only instrumentation and
    // must never reach production logs (which are retained and often shipped to
    // third-party drains). Gated behind an explicit opt-in; silent otherwise.
    if (process.env.DEBUG_SHADOW_LOGS === "true") {
      console.log(
        `[current-self-shadow] ${JSON.stringify({
          primaryEngine,
          comparison: compareCurrentSelfDrafts(legacyDraft, briefDraft, briefDraft.themes),
          legacyDraft,
          briefDraft,
        })}`,
      );
    }
  } catch {
    // Shadow comparison must never affect the primary generation.
  }
}

export async function generateCurrentSelf(
  reflectionInput?: GenerateCurrentSelfInput,
): Promise<
  { currentSelf: CurrentSelf } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const input = await loadGenerationInput(auth.userId);
  if ("error" in input) {
    return input;
  }

  if (
    input.momentCount < 1 ||
    input.checkInCount < 1 ||
    input.activeFutureSelfCount < 1
  ) {
    return { error: CURRENT_SELF_PREREQUISITE_ERROR };
  }

  let engine: CurrentSelfEngine;
  try {
    engine = getCurrentSelfEngine();
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Current Self engine is misconfigured.",
    };
  }

  let usedEngine: CurrentSelfEngine = engine;
  let draftResult: CurrentSelfDraftResult;

  if (engine === "brief") {
    const briefResult = await generateBriefCurrentSelfDraft(auth.userId, reflectionInput);
    if ("fallbackToLegacy" in briefResult) {
      usedEngine = "legacy";
      draftResult = await generateLegacyCurrentSelfDraft(auth.userId, reflectionInput);
    } else {
      draftResult = briefResult;
    }
  } else {
    draftResult = await generateLegacyCurrentSelfDraft(auth.userId, reflectionInput);
  }

  if (!draftResult.ok) {
    return { error: draftResult.error };
  }

  const draft = draftResult.draft;
  if (!draft) {
    return { error: CURRENT_SELF_PREREQUISITE_ERROR };
  }

  await runCurrentSelfShadowComparison(auth.userId, usedEngine, draft, reflectionInput);

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("current_self")
    .select("id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("current_self")
      .update({
        title: draft.title,
        summary: draft.summary,
        themes: draft.themes,
        values: draft.values,
        afraid_of_becoming: draft.afraid_of_becoming,
        core_tension: draft.core_tension,
        core_tradeoff: draft.core_tradeoff ?? "",
        recent_growth: draft.recent_growth,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return { error: updateError?.message ?? "Failed to update current self." };
    }

    return { currentSelf: updated };
  }

  const { data: created, error: insertError } = await supabase
    .from("current_self")
    .insert({
      user_id: auth.userId,
      title: draft.title,
      summary: draft.summary,
      themes: draft.themes,
      values: draft.values,
      afraid_of_becoming: draft.afraid_of_becoming,
      core_tension: draft.core_tension,
      core_tradeoff: draft.core_tradeoff ?? "",
      recent_growth: draft.recent_growth,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    return { error: insertError?.message ?? "Failed to create current self." };
  }

  return { currentSelf: created };
}

// How long a regeneration "covers" subsequent low-weight events. Events
// inside this window are treated as already reflected in the last
// regeneration and are skipped, so routine activity doesn't spam the
// generator. Pass `immediate: true` to bypass this for events (an answered
// reflection) that should update Current Self right away.
const REGENERATION_DEBOUNCE_MS = 15 * 60 * 1000;

async function getCurrentSelfUpdatedAt(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("current_self")
    .select("updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.updated_at ?? null;
}

export type ActivitySummary = {
  checkInCount: number;
  reflectionCount: number;
  monthsActive: number;
};

export async function getActivitySummary(): Promise<ActivitySummary> {
  const auth = await requireUser();
  if ("error" in auth) {
    return { checkInCount: 0, reflectionCount: 0, monthsActive: 0 };
  }

  const supabase = await createClient();
  const [
    { count: checkInCount },
    { count: reflectionCount },
    { data: earliest },
  ] = await Promise.all([
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.userId),
    // "Reflections" in the product vocabulary are answered reflection
    // questions on check-ins — not identity-prompt responses, which this
    // stat previously counted and which read 0 beside the "built only from
    // what you've recorded" promise.
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .not("reflection_question", "is", null)
      .not("reflection_answer", "is", null)
      .neq("reflection_answer", ""),
    supabase
      .from("moments")
      .select("created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  let monthsActive = 0;
  if (earliest?.created_at) {
    const msPerMonth = 1000 * 60 * 60 * 24 * 30;
    monthsActive = Math.max(
      1,
      Math.round((Date.now() - new Date(earliest.created_at).getTime()) / msPerMonth),
    );
  }

  return {
    checkInCount: checkInCount ?? 0,
    reflectionCount: reflectionCount ?? 0,
    monthsActive,
  };
}

/**
 * Single entry point for identity-relevant events to request that Current
 * Self be brought up to date. Debounced by default; callers for
 * high-significance events (e.g. an answered reflection) pass
 * `immediate: true` to skip the debounce window.
 */
export async function requestCurrentSelfRegeneration(
  userId: string,
  options?: { immediate?: boolean; reflectionInput?: GenerateCurrentSelfInput },
): Promise<void> {
  if (!options?.immediate) {
    const updatedAt = await getCurrentSelfUpdatedAt(userId);
    if (updatedAt && Date.now() - new Date(updatedAt).getTime() < REGENERATION_DEBOUNCE_MS) {
      return;
    }
  }

  await generateCurrentSelf(options?.reflectionInput)
    .then((result) => {
      // Missing prerequisites is the expected state for new users (no moment,
      // check-in, or active Future Self yet), not an operational failure.
      if ("error" in result && result.error === CURRENT_SELF_PREREQUISITE_ERROR) {
        return;
      }
      return reportDiscardedResultError(
        "requestCurrentSelfRegeneration: Current Self generation failed",
        result,
        { userId },
      );
    })
    .catch(
      swallowReporting("requestCurrentSelfRegeneration: Current Self generation failed", {
        userId,
      }),
    );
}
