import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { identityUpdateNullableOutputSchema } from "@/lib/ai/schemas/identity-update";
import { createClient } from "@/lib/supabase/server";
import type { CheckIn, IdentityUpdate, Moment } from "@/types/database";

export async function listIdentityUpdates(
  limit = 5,
): Promise<{ identityUpdates: IdentityUpdate[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("identity_updates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message };
  }

  return { identityUpdates: data };
}

export async function listIdentityUpdatesForMoment(
  momentId: string,
): Promise<{ identityUpdates: IdentityUpdate[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("identity_updates")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { identityUpdates: data };
}

export async function createIdentityUpdateIfMeaningful(input: {
  userId: string;
  moment: Pick<Moment, "id" | "title">;
  checkIn: CheckIn;
}): Promise<void> {
  const supabase = await createClient();

  const { error: priorError } = await supabase
    .from("check_ins")
    .select("theme_changes")
    .eq("moment_id", input.moment.id)
    .eq("user_id", input.userId)
    .neq("id", input.checkIn.id)
    .order("created_at", { ascending: true });

  if (priorError) {
    return;
  }

  const generationResult = await runStructuredGeneration({
    userId: input.userId,
    profile: "identity_update",
    promptId: "identity_update.generate",
    schema: identityUpdateNullableOutputSchema,
    overrides: {
      momentId: input.moment.id,
      pathId: input.checkIn.path_id,
      reflection: input.checkIn.reflection,
      checkInId: input.checkIn.id,
    },
  });

  if (!generationResult.ok) {
    return;
  }

  const draft = generationResult.data;

  if (!draft) {
    return;
  }

  const { data: identityUpdate, error: insertError } = await supabase
    .from("identity_updates")
    .insert({
      user_id: input.userId,
      moment_id: input.moment.id,
      check_in_id: input.checkIn.id,
      update_type: draft.update_type,
      title: draft.title,
      summary: draft.summary,
      themes: draft.themes,
    })
    .select("*")
    .single();

  if (insertError || !identityUpdate) {
    return;
  }

  await supabase.from("timeline_events").insert({
    user_id: input.userId,
    event_type: "identity_update",
    reference_type: "identity_update",
    reference_id: identityUpdate.id,
    title: draft.title,
    summary: draft.summary,
    metadata: {
      moment_id: input.moment.id,
      check_in_id: input.checkIn.id,
      identity_update_id: identityUpdate.id,
      update_type: draft.update_type,
      themes: draft.themes,
    },
  });
}
