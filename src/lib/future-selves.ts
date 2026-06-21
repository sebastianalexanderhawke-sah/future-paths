import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { futureSelfDiscoverOutputSchema } from "@/lib/ai/schemas/future-self";
import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import { createClient } from "@/lib/supabase/server";
import type { FutureSelf } from "@/types/database";

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
  limit = 4,
): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  return listFutureSelves({ status: "active", limit });
}

type GenerationInput = { momentCount: number } | { error: string };

async function loadGenerationInput(userId: string): Promise<GenerationInput> {
  const supabase = await createClient();

  const [
    { count: momentCount, error: momentError },
    { error: checkInError },
    { error: pathsError },
    { error: checkInsError },
    { error: updatesError },
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
      .from("paths")
      .select("themes")
      .eq("user_id", userId)
      .eq("is_chosen", true),
    supabase.from("check_ins").select("theme_changes").eq("user_id", userId),
    supabase.from("identity_updates").select("themes").eq("user_id", userId),
  ]);

  if (momentError || checkInError || pathsError || checkInsError || updatesError) {
    return {
      error:
        momentError?.message ??
        checkInError?.message ??
        pathsError?.message ??
        checkInsError?.message ??
        updatesError?.message ??
        "Failed to load history.",
    };
  }

  return {
    momentCount: momentCount ?? 0,
  };
}

async function recordFutureSelfEvent(input: {
  userId: string;
  futureSelfId: string;
  eventType: "emerged" | "grew" | "faded" | "returned";
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

export async function generateFutureSelves(): Promise<
  { futureSelves: FutureSelf[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const input = await loadGenerationInput(auth.userId);
  if ("error" in input) {
    return input;
  }

  let drafts: MockFutureSelfDraft[];

  if (input.momentCount < 1) {
    drafts = [];
  } else {
    const generationResult = await runStructuredGeneration({
      userId: auth.userId,
      profile: "future_self",
      promptId: "future_self.discover",
      schema: futureSelfDiscoverOutputSchema,
    });

    if (!generationResult.ok) {
      return { error: generationResult.error };
    }

    drafts = generationResult.data;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabase
    .from("future_selves")
    .select("*")
    .eq("user_id", auth.userId);

  if (existingError) {
    return { error: existingError.message };
  }

  const existingByName = new Map(
    (existingRows ?? []).map((row) => [row.name, row as FutureSelf]),
  );
  const draftNames = new Set(drafts.map((draft) => draft.name));

  // Only an evidence_strength/status transition marks Current Self stale — a
  // percentage tick alone (no strength change) is too noisy a signal on its own.
  let hasMeaningfulTransition = false;

  for (const draft of drafts) {
    const existing = existingByName.get(draft.name);

    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from("future_selves")
        .insert({
          user_id: auth.userId,
          name: draft.name,
          summary: draft.summary,
          percentage: draft.percentage,
          evidence_strength: draft.evidence_strength,
          benefits: draft.benefits,
          consequences: draft.consequences,
          prediction: draft.prediction,
          themes: draft.themes,
          status: "active",
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
        percentageAfter: draft.percentage,
        summary: `${draft.name} may be emerging from your patterns.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    if (existing.status === "faded") {
      const { error: updateError } = await supabase
        .from("future_selves")
        .update({
          summary: draft.summary,
          percentage: draft.percentage,
          evidence_strength: draft.evidence_strength,
          benefits: draft.benefits,
          consequences: draft.consequences,
          prediction: draft.prediction,
          themes: draft.themes,
          status: "active",
          updated_at: now,
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
        percentageAfter: draft.percentage,
        summary: `${draft.name} may be returning as your patterns shift.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    const percentageIncreased = draft.percentage > existing.percentage;
    const evidenceStrengthChanged = draft.evidence_strength !== existing.evidence_strength;
    const hasChanges =
      percentageIncreased ||
      evidenceStrengthChanged ||
      draft.summary !== existing.summary ||
      draft.prediction !== existing.prediction ||
      JSON.stringify(draft.themes) !== JSON.stringify(existing.themes) ||
      JSON.stringify(draft.benefits) !== JSON.stringify(existing.benefits) ||
      JSON.stringify(draft.consequences) !== JSON.stringify(existing.consequences);

    if (!hasChanges) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("future_selves")
      .update({
        summary: draft.summary,
        percentage: draft.percentage,
        evidence_strength: draft.evidence_strength,
        benefits: draft.benefits,
        consequences: draft.consequences,
        prediction: draft.prediction,
        themes: draft.themes,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId);

    if (updateError) {
      return { error: updateError.message };
    }

    if (percentageIncreased) {
      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: existing.id,
        eventType: "grew",
        percentageBefore: existing.percentage,
        percentageAfter: draft.percentage,
        summary: `${draft.name} may be gaining strength.`,
      });
    }

    if (evidenceStrengthChanged) {
      hasMeaningfulTransition = true;
    }
  }

  for (const existing of existingRows ?? []) {
    if (existing.status !== "active" || draftNames.has(existing.name)) {
      continue;
    }

    const { error: fadeError } = await supabase
      .from("future_selves")
      .update({
        status: "faded",
        percentage: 0,
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
