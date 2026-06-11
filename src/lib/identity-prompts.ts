import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { identityPromptDiscoverOutputSchema } from "@/lib/ai/schemas/identity-prompt";
import { createClient } from "@/lib/supabase/server";
import type {
  IdentityPrompt,
  IdentityPromptResponse,
} from "@/types/database";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

const IDENTITY_PROMPT_EMPTY_ERROR =
  "Identity prompts need at least one moment and one check-in.";

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

type GenerationInput =
  | {
      momentCount: number;
      checkInCount: number;
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

  const [
    { count: momentCount, error: momentError },
    { count: checkInCount, error: checkInCountError },
    { error: currentSelfError },
    { error: futuresError },
    { error: updatesError },
    { error: pathsError },
    { error: checkInsError },
  ] = await Promise.all([
    supabase
      .from("moments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
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
      .from("identity_updates")
      .select("themes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("paths")
      .select("themes")
      .eq("user_id", userId)
      .eq("is_chosen", true),
    supabase.from("check_ins").select("theme_changes").eq("user_id", userId),
  ]);

  if (
    momentError ||
    checkInCountError ||
    currentSelfError ||
    futuresError ||
    updatesError ||
    pathsError ||
    checkInsError
  ) {
    return {
      error:
        momentError?.message ??
        checkInCountError?.message ??
        currentSelfError?.message ??
        futuresError?.message ??
        updatesError?.message ??
        pathsError?.message ??
        checkInsError?.message ??
        "Failed to load history.",
    };
  }

  return {
    momentCount: momentCount ?? 0,
    checkInCount: checkInCount ?? 0,
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

  if (input.momentCount < 1 || input.checkInCount < 1) {
    return { error: IDENTITY_PROMPT_EMPTY_ERROR };
  }

  const generationResult = await runStructuredGeneration({
    userId: auth.userId,
    profile: "identity_prompt",
    promptId: "identity_prompt.generate",
    schema: identityPromptDiscoverOutputSchema,
  });

  if (!generationResult.ok) {
    return { error: generationResult.error };
  }

  const drafts = generationResult.data;
  if (drafts.length === 0) {
    return { error: IDENTITY_PROMPT_EMPTY_ERROR };
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
