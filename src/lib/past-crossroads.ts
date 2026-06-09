import { generateMockAlternateSelf } from "@/lib/mock-alternate-self-generator";
import { generateMockPastAlternativePaths } from "@/lib/mock-past-alternative-path-generator";
import { createClient } from "@/lib/supabase/server";
import type {
  AlternateSelf,
  PastAlternativePath,
  PastCrossroad,
} from "@/types/database";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

const WHAT_HAPPENED_MAX_LENGTH = 5000;
const OPTIONAL_FIELD_MAX_LENGTH = 1000;

export type PastCrossroadListItem = {
  crossroad: PastCrossroad;
  alternateSelf: AlternateSelf | null;
};

export type PastCrossroadDetail = {
  crossroad: PastCrossroad;
  alternativePaths: PastAlternativePath[];
  alternateSelf: AlternateSelf | null;
};

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

function validateWhatHappened(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "What happened is required.";
  }

  if (trimmed.length > WHAT_HAPPENED_MAX_LENGTH) {
    return `What happened must be ${WHAT_HAPPENED_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

function validateOptionalField(value: string | null, label: string): string | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  if (value.trim().length > OPTIONAL_FIELD_MAX_LENGTH) {
    return `${label} must be ${OPTIONAL_FIELD_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

async function getOwnedCrossroad(
  crossroadId: string,
  userId: string,
): Promise<PastCrossroad | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("past_crossroads")
    .select("*")
    .eq("id", crossroadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Past crossroad not found." };
  }

  return data;
}

export async function listPastCrossroads(
  limit?: number,
): Promise<{ crossroads: PastCrossroadListItem[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  let query = supabase
    .from("past_crossroads")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: crossroads, error } = await query;

  if (error) {
    return { error: error.message };
  }

  const crossroadIds = (crossroads ?? []).map((crossroad) => crossroad.id);

  if (crossroadIds.length === 0) {
    return { crossroads: [] };
  }

  const { data: alternateSelves, error: alternateError } = await supabase
    .from("alternate_selves")
    .select("*")
    .eq("user_id", auth.userId)
    .in("past_crossroad_id", crossroadIds);

  if (alternateError) {
    return { error: alternateError.message };
  }

  const alternateByCrossroad = new Map(
    (alternateSelves ?? []).map((alternateSelf) => [
      alternateSelf.past_crossroad_id,
      alternateSelf,
    ]),
  );

  return {
    crossroads: (crossroads ?? []).map((crossroad) => ({
      crossroad,
      alternateSelf: alternateByCrossroad.get(crossroad.id) ?? null,
    })),
  };
}

export async function getPastCrossroad(
  crossroadId: string,
): Promise<PastCrossroadDetail | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const crossroad = await getOwnedCrossroad(crossroadId, auth.userId);
  if ("error" in crossroad) {
    return crossroad;
  }

  const supabase = await createClient();

  const { data: alternativePaths, error: pathsError } = await supabase
    .from("past_alternative_paths")
    .select("*")
    .eq("past_crossroad_id", crossroadId)
    .eq("user_id", auth.userId)
    .order("sort_order", { ascending: true });

  if (pathsError) {
    return { error: pathsError.message };
  }

  const { data: alternateSelf, error: alternateError } = await supabase
    .from("alternate_selves")
    .select("*")
    .eq("past_crossroad_id", crossroadId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (alternateError) {
    return { error: alternateError.message };
  }

  return {
    crossroad,
    alternativePaths: alternativePaths ?? [],
    alternateSelf: alternateSelf ?? null,
  };
}

export async function createPastCrossroad(input: {
  whatHappened: string;
  whyChosen?: string | null;
  lifeStage?: string | null;
}): Promise<{ crossroad: PastCrossroad } | { error: string }> {
  const whatHappenedError = validateWhatHappened(input.whatHappened);
  if (whatHappenedError) {
    return { error: whatHappenedError };
  }

  const whyChosen =
    typeof input.whyChosen === "string" ? input.whyChosen.trim() : null;
  const lifeStage =
    typeof input.lifeStage === "string" ? input.lifeStage.trim() : null;

  const whyChosenError = validateOptionalField(whyChosen, "Why you chose it");
  if (whyChosenError) {
    return { error: whyChosenError };
  }

  const lifeStageError = validateOptionalField(lifeStage, "Life stage");
  if (lifeStageError) {
    return { error: lifeStageError };
  }

  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("past_crossroads")
    .insert({
      user_id: auth.userId,
      what_happened: input.whatHappened.trim(),
      why_chosen: whyChosen,
      life_stage: lifeStage,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create past crossroad." };
  }

  return { crossroad: data };
}

export async function generateAlternativePaths(
  crossroadId: string,
): Promise<{ paths: PastAlternativePath[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const crossroad = await getOwnedCrossroad(crossroadId, auth.userId);
  if ("error" in crossroad) {
    return crossroad;
  }

  const supabase = await createClient();

  await supabase.from("alternate_selves").delete().eq("past_crossroad_id", crossroadId);
  await supabase.from("past_alternative_paths").delete().eq("past_crossroad_id", crossroadId);

  const drafts = generateMockPastAlternativePaths(crossroad);
  const rows = drafts.map((draft, index) => ({
    past_crossroad_id: crossroadId,
    user_id: auth.userId,
    title: draft.title,
    description: draft.description,
    themes: draft.themes,
    possible_future_shift: draft.possible_future_shift,
    sort_order: index,
    is_selected: false,
  }));

  const { data, error } = await supabase
    .from("past_alternative_paths")
    .insert(rows)
    .select("*");

  if (error || !data) {
    return { error: error?.message ?? "Failed to generate alternative paths." };
  }

  return { paths: data };
}

export async function selectAlternativePath(
  crossroadId: string,
  pathId: string,
): Promise<{ path: PastAlternativePath } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const crossroad = await getOwnedCrossroad(crossroadId, auth.userId);
  if ("error" in crossroad) {
    return crossroad;
  }

  const supabase = await createClient();

  const { data: path, error: pathError } = await supabase
    .from("past_alternative_paths")
    .select("*")
    .eq("id", pathId)
    .eq("past_crossroad_id", crossroadId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (pathError) {
    return { error: pathError.message };
  }

  if (!path) {
    return { error: "Alternative path not found." };
  }

  await supabase
    .from("past_alternative_paths")
    .update({ is_selected: false })
    .eq("past_crossroad_id", crossroadId)
    .eq("user_id", auth.userId);

  const { data: updatedPath, error: updateError } = await supabase
    .from("past_alternative_paths")
    .update({ is_selected: true })
    .eq("id", pathId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (updateError || !updatedPath) {
    return { error: updateError?.message ?? "Failed to select alternative path." };
  }

  await supabase.from("alternate_selves").delete().eq("past_crossroad_id", crossroadId);

  return { path: updatedPath };
}

export async function generateAlternateSelf(
  crossroadId: string,
): Promise<{ alternateSelf: AlternateSelf } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const detail = await getPastCrossroad(crossroadId);
  if ("error" in detail) {
    return detail;
  }

  const selectedPath = detail.alternativePaths.find((path) => path.is_selected);

  if (!selectedPath) {
    return { error: "Select an alternative path before generating your alternate self." };
  }

  const draft = generateMockAlternateSelf({
    crossroad: detail.crossroad,
    selectedPath,
  });

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("alternate_selves")
    .select("id")
    .eq("past_crossroad_id", crossroadId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("alternate_selves")
      .update({
        selected_alternative_path_id: selectedPath.id,
        name: draft.name,
        road_not_taken: draft.road_not_taken,
        alternate_self: draft.alternate_self,
        what_remains_available: draft.what_remains_available,
        themes: draft.themes,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return { error: updateError?.message ?? "Failed to update alternate self." };
    }

    return { alternateSelf: updated };
  }

  const { data: created, error: insertError } = await supabase
    .from("alternate_selves")
    .insert({
      user_id: auth.userId,
      past_crossroad_id: crossroadId,
      selected_alternative_path_id: selectedPath.id,
      name: draft.name,
      road_not_taken: draft.road_not_taken,
      alternate_self: draft.alternate_self,
      what_remains_available: draft.what_remains_available,
      themes: draft.themes,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    return { error: insertError?.message ?? "Failed to generate alternate self." };
  }

  return { alternateSelf: created };
}

export async function archivePastCrossroad(
  crossroadId: string,
): Promise<{ crossroad: PastCrossroad } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("past_crossroads")
    .update({ status: "archived", updated_at: now })
    .eq("id", crossroadId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to archive past crossroad." };
  }

  await supabase
    .from("alternate_selves")
    .update({ status: "archived", updated_at: now })
    .eq("past_crossroad_id", crossroadId)
    .eq("user_id", auth.userId);

  return { crossroad: data };
}
