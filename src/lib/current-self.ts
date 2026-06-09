import { generateMockCurrentSelf } from "@/lib/mock-current-self-generator";
import { createClient } from "@/lib/supabase/server";
import type { CheckIn, CurrentSelf, FutureSelf, IdentityUpdate } from "@/types/database";
import type { ThemeName } from "@/types/enums";

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

type GenerationInput = {
  momentCount: number;
  checkInCount: number;
  activeFutureSelves: FutureSelf[];
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes" | "identity_impact">[];
  identityUpdates: Pick<IdentityUpdate, "title" | "summary" | "themes">[];
};

async function loadGenerationInput(userId: string): Promise<
  GenerationInput | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const { count: momentCount, error: momentError } = await supabase
    .from("moments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (momentError) {
    return { error: momentError.message };
  }

  const { count: checkInCount, error: checkInCountError } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (checkInCountError) {
    return { error: checkInCountError.message };
  }

  const { data: activeFutureSelves, error: futuresError } = await supabase
    .from("future_selves")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("momentum", { ascending: false });

  if (futuresError) {
    return { error: futuresError.message };
  }

  const { data: chosenPaths, error: pathsError } = await supabase
    .from("paths")
    .select("themes")
    .eq("user_id", userId)
    .eq("is_chosen", true);

  if (pathsError) {
    return { error: pathsError.message };
  }

  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("theme_changes, identity_impact")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (checkInsError) {
    return { error: checkInsError.message };
  }

  const { data: identityUpdates, error: updatesError } = await supabase
    .from("identity_updates")
    .select("title, summary, themes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (updatesError) {
    return { error: updatesError.message };
  }

  return {
    momentCount: momentCount ?? 0,
    checkInCount: checkInCount ?? 0,
    activeFutureSelves: activeFutureSelves ?? [],
    pathThemes: (chosenPaths ?? []).flatMap((path) => path.themes),
    checkIns: checkIns ?? [],
    identityUpdates: identityUpdates ?? [],
  };
}

export async function generateCurrentSelf(): Promise<
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

  const draft = generateMockCurrentSelf(input);
  if (!draft) {
    return {
      error:
        "Current Self needs at least one moment, one check-in, and one active Future Self.",
    };
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
        headline: draft.headline,
        summary: draft.summary,
        themes: draft.themes,
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
      headline: draft.headline,
      summary: draft.summary,
      themes: draft.themes,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    return { error: insertError?.message ?? "Failed to create current self." };
  }

  return { currentSelf: created };
}
