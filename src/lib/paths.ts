import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { encodePathDescriptionWithNativeTitle } from "@/components/home/path-native-title";
import { crossroadOutputSchema } from "@/lib/ai/schemas/crossroad";
import { createClient } from "@/lib/supabase/server";
import type { Path } from "@/types/database";
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

function collectThemes(paths: { themes: ThemeName[] }[]): ThemeName[] {
  const seen = new Set<ThemeName>();
  for (const path of paths) {
    for (const theme of path.themes) {
      seen.add(theme);
    }
  }
  return [...seen];
}

export async function listPathsForMoment(
  momentId: string,
): Promise<{ paths: Path[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("paths")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { paths: data };
}

export async function generatePaths(
  momentId: string,
): Promise<{ paths: Path[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .select("*")
    .eq("id", momentId)
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .maybeSingle();

  if (momentError) {
    return { error: momentError.message };
  }

  if (!moment) {
    return { error: "Moment not found." };
  }

  const { data: existingPaths, error: existingError } = await supabase
    .from("paths")
    .select("id")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .limit(1);

  if (existingError) {
    return { error: existingError.message };
  }

  if (existingPaths && existingPaths.length > 0) {
    return { error: "Paths have already been generated for this moment." };
  }

  const generationResult = await runStructuredGeneration({
    userId: auth.userId,
    profile: "crossroad",
    promptId: "crossroad.generate",
    schema: crossroadOutputSchema,
    overrides: {
      momentId,
    },
  });

  if (!generationResult.ok) {
    return { error: generationResult.error };
  }

  const generated = generationResult.data;

  const { error: updateError } = await supabase
    .from("moments")
    .update({ current_understanding: generated.current_understanding })
    .eq("id", momentId)
    .eq("user_id", auth.userId);

  if (updateError) {
    return { error: updateError.message };
  }

  const pathRows = generated.paths.map((path, index) => ({
    moment_id: momentId,
    user_id: auth.userId,
    description: encodePathDescriptionWithNativeTitle(path.title ?? "", path.description),
    benefits: path.benefits,
    consequences: path.consequences,
    future_shift: path.future_shift,
    themes: path.themes,
    sort_order: index,
  }));

  const { data: insertedPaths, error: pathsError } = await supabase
    .from("paths")
    .insert(pathRows)
    .select("*");

  if (pathsError || !insertedPaths) {
    await supabase
      .from("moments")
      .update({ current_understanding: moment.current_understanding })
      .eq("id", momentId);
    return { error: pathsError?.message ?? "Failed to generate paths." };
  }

  const themes = collectThemes(generated.paths);

  const { error: timelineError } = await supabase.from("timeline_events").insert({
    user_id: auth.userId,
    event_type: "paths_generated",
    reference_type: "moment",
    reference_id: momentId,
    title: "Paths explored",
    summary: generated.current_understanding,
    metadata: {
      moment_id: momentId,
      moment_title: moment.title,
      path_count: insertedPaths.length,
      themes,
    },
  });

  if (timelineError) {
    await supabase.from("paths").delete().eq("moment_id", momentId);
    await supabase
      .from("moments")
      .update({ current_understanding: moment.current_understanding })
      .eq("id", momentId);
    return { error: timelineError.message };
  }

  return { paths: insertedPaths };
}

export async function choosePath(
  momentId: string,
  pathId: string,
): Promise<{ path: Path } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .select("id, title")
    .eq("id", momentId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (momentError) {
    return { error: momentError.message };
  }

  if (!moment) {
    return { error: "Moment not found." };
  }

  const { data: chosenExisting, error: chosenError } = await supabase
    .from("paths")
    .select("id")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .eq("is_chosen", true)
    .maybeSingle();

  if (chosenError) {
    return { error: chosenError.message };
  }

  if (chosenExisting) {
    return { error: "A path has already been chosen for this moment." };
  }

  const { data: path, error: pathError } = await supabase
    .from("paths")
    .select("*")
    .eq("id", pathId)
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (pathError) {
    return { error: pathError.message };
  }

  if (!path) {
    return { error: "Path not found." };
  }

  if (path.is_locked) {
    return { error: "This path is locked." };
  }

  const chosenAt = new Date().toISOString();

  const { data: updatedPath, error: updateError } = await supabase
    .from("paths")
    .update({
      is_chosen: true,
      chosen_at: chosenAt,
    })
    .eq("id", pathId)
    .eq("user_id", auth.userId)
    .select("*")
    .maybeSingle();

  if (updateError) {
    return { error: updateError.message };
  }

  if (!updatedPath) {
    return { error: "Failed to choose path." };
  }

  const { error: timelineError } = await supabase.from("timeline_events").insert({
    user_id: auth.userId,
    event_type: "path_chosen",
    reference_type: "path",
    reference_id: pathId,
    title: "Path chosen",
    summary: path.description,
    metadata: {
      moment_id: momentId,
      path_id: pathId,
      path_description: path.description,
      themes: path.themes,
    },
  });

  if (timelineError) {
    await supabase
      .from("paths")
      .update({
        is_chosen: false,
        chosen_at: null,
      })
      .eq("id", pathId);
    return { error: timelineError.message };
  }

  return { path: updatedPath };
}
