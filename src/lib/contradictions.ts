import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { contradictionOutputSchema } from "@/lib/ai/schemas/contradiction";
import { createClient } from "@/lib/supabase/server";
import type { Contradiction, ContradictionEvent } from "@/types/database";
import type { ContradictionEventType } from "@/types/enums";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

const MAX_ACTIVE_CONTRADICTIONS = 3;
const CURRENT_SELF_REQUIRED_ERROR =
  "Contradictions require a Current Self. Generate one first.";
const DETECTION_PREREQUISITE_ERROR =
  "Contradictions need at least one answered identity prompt or two check-ins.";
const NO_TENSIONS_ERROR = "No identity tensions detected from your current signals.";

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

type DetectionInput =
  | {
      checkInCount: number;
      hasCurrentSelf: boolean;
      answeredResponseCount: number;
    }
  | { error: string };

async function loadDetectionInput(userId: string): Promise<DetectionInput> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const [
    { count: checkInCount, error: checkInCountError },
    { data: currentSelf, error: currentSelfError },
    { error: futuresError },
    { data: answeredPrompts, error: promptsError },
  ] = await Promise.all([
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase.from("current_self").select("id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("future_selves")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase
      .from("identity_prompts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "answered")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (checkInCountError || currentSelfError || futuresError || promptsError) {
    return {
      error:
        checkInCountError?.message ??
        currentSelfError?.message ??
        futuresError?.message ??
        promptsError?.message ??
        "Failed to load history.",
    };
  }

  const promptIds = (answeredPrompts ?? []).map((prompt) => prompt.id);
  let answeredResponseCount = 0;

  if (promptIds.length > 0) {
    const { data: responses, error: responsesError } = await supabase
      .from("identity_prompt_responses")
      .select("id, prompt_id")
      .eq("user_id", userId)
      .in("prompt_id", promptIds);

    if (responsesError) {
      return { error: responsesError.message };
    }

    answeredResponseCount = responses?.length ?? 0;
  }

  return {
    checkInCount: checkInCount ?? 0,
    hasCurrentSelf: Boolean(currentSelf),
    answeredResponseCount,
  };
}

async function appendContradictionEvent(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  contradictionId: string;
  eventType: ContradictionEventType;
  intensityBefore: number | null;
  intensityAfter: number | null;
  summary?: string | null;
}): Promise<void> {
  await input.supabase.from("contradiction_events").insert({
    user_id: input.userId,
    contradiction_id: input.contradictionId,
    event_type: input.eventType,
    intensity_before: input.intensityBefore,
    intensity_after: input.intensityAfter,
    summary: input.summary ?? null,
  });
}

export async function listActiveContradictions(
  limit = MAX_ACTIVE_CONTRADICTIONS,
): Promise<{ contradictions: Contradiction[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contradictions")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("intensity", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message };
  }

  return { contradictions: data ?? [] };
}

export async function listContradictions(): Promise<
  { contradictions: Contradiction[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contradictions")
    .select("*")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { contradictions: data ?? [] };
}

export async function getContradiction(
  contradictionId: string,
): Promise<
  | { contradiction: Contradiction; events: ContradictionEvent[] }
  | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data: contradiction, error: contradictionError } = await supabase
    .from("contradictions")
    .select("*")
    .eq("id", contradictionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (contradictionError) {
    return { error: contradictionError.message };
  }

  if (!contradiction) {
    return { error: "Contradiction not found." };
  }

  const { data: events, error: eventsError } = await supabase
    .from("contradiction_events")
    .select("*")
    .eq("contradiction_id", contradictionId)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (eventsError) {
    return { error: eventsError.message };
  }

  return { contradiction, events: events ?? [] };
}

export async function detectContradictions(): Promise<
  { contradictions: Contradiction[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const input = await loadDetectionInput(auth.userId);
  if ("error" in input) {
    return input;
  }

  if (!input.hasCurrentSelf) {
    return {
      error: CURRENT_SELF_REQUIRED_ERROR,
    };
  }

  if (input.answeredResponseCount < 1 && input.checkInCount < 2) {
    return {
      error: DETECTION_PREREQUISITE_ERROR,
    };
  }

  const generationResult = await runStructuredGeneration({
    userId: auth.userId,
    profile: "contradiction",
    promptId: "contradiction.detect",
    schema: contradictionOutputSchema,
  });

  if (!generationResult.ok) {
    return { error: generationResult.error };
  }

  const drafts = generationResult.data;
  if (drafts.length === 0) {
    return {
      error: NO_TENSIONS_ERROR,
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabase
    .from("contradictions")
    .select("*")
    .eq("user_id", auth.userId);

  if (existingError) {
    return { error: existingError.message };
  }

  const existing = existingRows ?? [];
  const draftSignatures = new Set(drafts.map((draft) => draft.signature));

  for (const row of existing) {
    if (row.status !== "active") {
      continue;
    }

    if (draftSignatures.has(row.signature)) {
      continue;
    }

    const { error: resolveError } = await supabase
      .from("contradictions")
      .update({ status: "resolved", updated_at: now })
      .eq("id", row.id)
      .eq("user_id", auth.userId);

    if (resolveError) {
      return { error: resolveError.message };
    }

    await appendContradictionEvent({
      supabase,
      userId: auth.userId,
      contradictionId: row.id,
      eventType: "resolved",
      intensityBefore: row.intensity,
      intensityAfter: row.intensity,
      summary: "This tension no longer appears in the latest detection pass.",
    });
  }

  let activeCount = existing.filter(
    (row) => row.status === "active" && draftSignatures.has(row.signature),
  ).length;

  for (const draft of drafts) {
    const existingMatch = existing.find((row) => row.signature === draft.signature);

    if (existingMatch) {
      const wasInactive = existingMatch.status !== "active";
      const intensityChanged = draft.intensity !== existingMatch.intensity;
      const nextStatus = wasInactive
        ? "active"
        : draft.intensity < existingMatch.intensity
          ? "softened"
          : "active";

      const { error: updateError } = await supabase
        .from("contradictions")
        .update({
          title: draft.title,
          summary: draft.summary,
          pole_a: draft.pole_a,
          pole_b: draft.pole_b,
          themes: draft.themes,
          intensity: draft.intensity,
          status: nextStatus,
          source_refs: draft.source_refs,
          updated_at: now,
        })
        .eq("id", existingMatch.id)
        .eq("user_id", auth.userId);

      if (updateError) {
        return { error: updateError.message };
      }

      if (wasInactive) {
        activeCount += 1;
        await appendContradictionEvent({
          supabase,
          userId: auth.userId,
          contradictionId: existingMatch.id,
          eventType: "detected",
          intensityBefore: existingMatch.intensity,
          intensityAfter: draft.intensity,
          summary: "This tension reappeared in the latest detection pass.",
        });
      } else if (intensityChanged) {
        await appendContradictionEvent({
          supabase,
          userId: auth.userId,
          contradictionId: existingMatch.id,
          eventType:
            draft.intensity > existingMatch.intensity ? "intensified" : "softened",
          intensityBefore: existingMatch.intensity,
          intensityAfter: draft.intensity,
          summary: "Intensity updated after a new detection pass.",
        });
      }

      continue;
    }

    if (activeCount >= MAX_ACTIVE_CONTRADICTIONS) {
      continue;
    }

    const { data: created, error: insertError } = await supabase
      .from("contradictions")
      .insert({
        user_id: auth.userId,
        contradiction_type: draft.contradiction_type,
        title: draft.title,
        summary: draft.summary,
        pole_a: draft.pole_a,
        pole_b: draft.pole_b,
        themes: draft.themes,
        intensity: draft.intensity,
        status: "active",
        source_refs: draft.source_refs,
        signature: draft.signature,
      })
      .select("*")
      .single();

    if (insertError || !created) {
      return { error: insertError?.message ?? "Failed to create contradiction." };
    }

    activeCount += 1;

    await appendContradictionEvent({
      supabase,
      userId: auth.userId,
      contradictionId: created.id,
      eventType: "detected",
      intensityBefore: null,
      intensityAfter: created.intensity,
      summary: "Contradiction detected from current identity signals.",
    });
  }

  return listActiveContradictions();
}
