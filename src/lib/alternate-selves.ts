import { generateMockAlternateSelf } from "@/lib/mock-alternate-self-generator";
import { createClient } from "@/lib/supabase/server";
import type { AlternateSelf } from "@/types/database";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

const DECISION_TITLE_MAX_LENGTH = 200;
const PATH_MAX_LENGTH = 5000;

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

function validateDecisionTitle(decisionTitle: string): string | null {
  const trimmed = decisionTitle.trim();

  if (!trimmed) {
    return "Decision title is required.";
  }

  if (trimmed.length > DECISION_TITLE_MAX_LENGTH) {
    return `Decision title must be ${DECISION_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

function validatePath(value: string, label: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return `${label} is required.`;
  }

  if (trimmed.length > PATH_MAX_LENGTH) {
    return `${label} must be ${PATH_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export async function listAlternateSelves(
  limit?: number,
): Promise<{ alternateSelves: AlternateSelf[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  let query = supabase
    .from("alternate_selves")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { alternateSelves: data ?? [] };
}

export async function getAlternateSelf(
  alternateSelfId: string,
): Promise<{ alternateSelf: AlternateSelf } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alternate_selves")
    .select("*")
    .eq("id", alternateSelfId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Alternate self not found." };
  }

  return { alternateSelf: data };
}

export async function createAlternateSelf(input: {
  decisionTitle: string;
  chosenPath: string;
  unchosenPath: string;
}): Promise<{ alternateSelf: AlternateSelf } | { error: string }> {
  const titleError = validateDecisionTitle(input.decisionTitle);
  if (titleError) {
    return { error: titleError };
  }

  const chosenError = validatePath(input.chosenPath, "Chosen path");
  if (chosenError) {
    return { error: chosenError };
  }

  const unchosenError = validatePath(input.unchosenPath, "Unchosen path");
  if (unchosenError) {
    return { error: unchosenError };
  }

  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const decisionTitle = input.decisionTitle.trim();
  const chosenPath = input.chosenPath.trim();
  const unchosenPath = input.unchosenPath.trim();

  const draft = generateMockAlternateSelf({
    decisionTitle,
    chosenPath,
    unchosenPath,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alternate_selves")
    .insert({
      user_id: auth.userId,
      decision_title: decisionTitle,
      chosen_path: chosenPath,
      unchosen_path: unchosenPath,
      name: draft.name,
      road_not_taken: draft.road_not_taken,
      alternate_self: draft.alternate_self,
      what_remains_available: draft.what_remains_available,
      themes: draft.themes,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create alternate self." };
  }

  return { alternateSelf: data };
}

export async function refreshAlternateSelf(
  alternateSelfId: string,
): Promise<{ alternateSelf: AlternateSelf } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const existing = await getAlternateSelf(alternateSelfId);
  if ("error" in existing) {
    return existing;
  }

  const draft = generateMockAlternateSelf({
    decisionTitle: existing.alternateSelf.decision_title,
    chosenPath: existing.alternateSelf.chosen_path,
    unchosenPath: existing.alternateSelf.unchosen_path,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alternate_selves")
    .update({
      name: draft.name,
      road_not_taken: draft.road_not_taken,
      alternate_self: draft.alternate_self,
      what_remains_available: draft.what_remains_available,
      themes: draft.themes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", alternateSelfId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to refresh alternate self." };
  }

  return { alternateSelf: data };
}

export async function archiveAlternateSelf(
  alternateSelfId: string,
): Promise<{ alternateSelf: AlternateSelf } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alternate_selves")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", alternateSelfId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to archive alternate self." };
  }

  return { alternateSelf: data };
}
