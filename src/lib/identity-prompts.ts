import { generateMockIdentityPrompts } from "@/lib/mock-identity-prompt-generator";
import { createClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  CurrentSelf,
  FutureSelf,
  IdentityPrompt,
  IdentityPromptResponse,
  IdentityUpdate,
} from "@/types/database";
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

type GenerationInput = {
  momentCount: number;
  checkInCount: number;
  currentSelf: CurrentSelf | null;
  activeFutureSelves: FutureSelf[];
  identityUpdates: Pick<IdentityUpdate, "title" | "summary" | "themes">[];
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes">[];
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

  const { data: currentSelf, error: currentSelfError } = await supabase
    .from("current_self")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentSelfError) {
    return { error: currentSelfError.message };
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

  const { data: identityUpdates, error: updatesError } = await supabase
    .from("identity_updates")
    .select("title, summary, themes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (updatesError) {
    return { error: updatesError.message };
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
    .select("theme_changes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (checkInsError) {
    return { error: checkInsError.message };
  }

  return {
    momentCount: momentCount ?? 0,
    checkInCount: checkInCount ?? 0,
    currentSelf: currentSelf ?? null,
    activeFutureSelves: activeFutureSelves ?? [],
    identityUpdates: identityUpdates ?? [],
    pathThemes: (chosenPaths ?? []).flatMap((path) => path.themes),
    checkIns: checkIns ?? [],
  };
}

export async function listPendingIdentityPrompts(
  limit = 5,
): Promise<{ prompts: IdentityPrompt[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identity_prompts")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message };
  }

  return { prompts: data ?? [] };
}

export async function listIdentityPrompts(): Promise<
  { prompts: IdentityPrompt[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identity_prompts")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { prompts: data ?? [] };
}

export async function getIdentityPrompt(
  promptId: string,
): Promise<
  | { prompt: IdentityPrompt; response: IdentityPromptResponse | null }
  | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data: prompt, error: promptError } = await supabase
    .from("identity_prompts")
    .select("*")
    .eq("id", promptId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (promptError) {
    return { error: promptError.message };
  }

  if (!prompt) {
    return { error: "Identity prompt not found." };
  }

  const { data: response, error: responseError } = await supabase
    .from("identity_prompt_responses")
    .select("*")
    .eq("prompt_id", promptId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (responseError) {
    return { error: responseError.message };
  }

  return { prompt, response: response ?? null };
}

export async function generateIdentityPrompts(): Promise<
  { prompts: IdentityPrompt[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const input = await loadGenerationInput(auth.userId);
  if ("error" in input) {
    return input;
  }

  const drafts = generateMockIdentityPrompts(input);
  if (drafts.length === 0) {
    return {
      error: "Identity prompts need at least one moment and one check-in.",
    };
  }

  const supabase = await createClient();
  const rows = drafts.map((draft) => ({
    user_id: auth.userId,
    prompt_type: draft.prompt_type,
    question: draft.question,
    context: draft.context,
    themes: draft.themes,
    status: "pending" as const,
  }));

  const { data: created, error: insertError } = await supabase
    .from("identity_prompts")
    .insert(rows)
    .select("*");

  if (insertError || !created) {
    return { error: insertError?.message ?? "Failed to create identity prompts." };
  }

  return { prompts: created };
}

export async function submitIdentityPromptResponse(
  promptId: string,
  responseText: string,
): Promise<
  { prompt: IdentityPrompt; response: IdentityPromptResponse } | { error: string }
> {
  const trimmed = responseText.trim();

  if (!trimmed) {
    return { error: "Response is required." };
  }

  if (trimmed.length > 5000) {
    return { error: "Response must be 5000 characters or fewer." };
  }

  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data: prompt, error: promptError } = await supabase
    .from("identity_prompts")
    .select("*")
    .eq("id", promptId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (promptError) {
    return { error: promptError.message };
  }

  if (!prompt) {
    return { error: "Identity prompt not found." };
  }

  if (prompt.status !== "pending") {
    return { error: "This prompt has already been answered." };
  }

  const { data: response, error: insertError } = await supabase
    .from("identity_prompt_responses")
    .insert({
      user_id: auth.userId,
      prompt_id: promptId,
      response: trimmed,
      themes: prompt.themes,
    })
    .select("*")
    .single();

  if (insertError || !response) {
    return { error: insertError?.message ?? "Failed to save response." };
  }

  const { data: updatedPrompt, error: updateError } = await supabase
    .from("identity_prompts")
    .update({ status: "answered" })
    .eq("id", promptId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (updateError || !updatedPrompt) {
    return { error: updateError?.message ?? "Failed to update prompt status." };
  }

  return { prompt: updatedPrompt, response };
}
