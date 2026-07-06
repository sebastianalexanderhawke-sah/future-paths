import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { currentSelfNullableOutputSchema } from "@/lib/ai/schemas/current-self";
import {
  reportDiscardedResultError,
  swallowReporting,
} from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { CurrentSelf } from "@/types/database";

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

  return { currentSelf: data };
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
  };
};

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

  const generationResult = await runStructuredGeneration({
    userId: auth.userId,
    profile: "current_self",
    promptId: "current_self.generate",
    schema: currentSelfNullableOutputSchema,
    overrides: reflectionInput?.reflection
      ? { reflectionQA: reflectionInput.reflection }
      : undefined,
  });

  if (!generationResult.ok) {
    return { error: generationResult.error };
  }

  const draft = generationResult.data;
  if (!draft) {
    return { error: CURRENT_SELF_PREREQUISITE_ERROR };
  }

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
        observations: draft.observations,
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
      observations: draft.observations,
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
