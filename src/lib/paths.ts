import { after } from "next/server";
import type { z } from "zod";

import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import {
  decodeNativePathFields,
  encodePathDescriptionWithNativeTitle,
} from "@/components/home/path-native-title";
import { crossroadOutputSchema } from "@/lib/ai/schemas/crossroad";
import { queueFutureSelvesGeneration } from "@/lib/future-selves";
import {
  reportDiscardedResultError,
  swallowReporting,
} from "@/lib/observability";
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

/**
 * Returns a map of momentId → display path title for all chosen paths
 * across the given set of moments. Safe to call with an empty array.
 */
export async function getChosenPathsForMoments(
  momentIds: string[],
): Promise<Record<string, string>> {
  if (momentIds.length === 0) return {};

  const auth = await requireUser();
  if ("error" in auth) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("paths")
    .select("moment_id, description")
    .in("moment_id", momentIds)
    .eq("user_id", auth.userId)
    .eq("is_chosen", true);

  if (!data) return {};

  const result: Record<string, string> = {};
  for (const row of data) {
    const { nativeTitle, description } = decodeNativePathFields(row.description);
    result[row.moment_id] = nativeTitle ?? description.slice(0, 60);
  }
  return result;
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
    return { error: "Paths have already been generated for this situation." };
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

  const persistResult = await persistGeneratedPaths({
    momentId,
    momentTitle: moment.title,
    generated,
  });

  if ("error" in persistResult) {
    return persistResult;
  }

  return { paths: persistResult.paths };
}

/**
 * Commits a generated path set through the atomic persistence layer. Shared by
 * the synchronous generatePaths flow above and the streaming
 * /api/stream/decision-simulator route, so every path set — however it was
 * generated — lands through the same commit_generated_paths RPC.
 *
 * Atomic: the moment update, the full path-set insert, and the timeline event
 * are committed in a single transaction inside commit_generated_paths, so a
 * failure leaves no partial state and needs no manual rollback. The
 * (moment_id, sort_order) unique index makes a concurrent duplicate set
 * impossible — the loser's insert raises a unique violation (23505) and the
 * whole transaction rolls back. Ownership is enforced inside the RPC via
 * auth.uid(), so no user id is passed from the caller.
 */
export async function persistGeneratedPaths(input: {
  momentId: string;
  momentTitle: string;
  generated: z.input<typeof crossroadOutputSchema>;
}): Promise<{ paths: Path[] } | { error: string }> {
  const { momentId, momentTitle, generated } = input;
  const supabase = await createClient();

  const themes = collectThemes(generated.paths);

  const pathRows = generated.paths.map((path, index) => ({
    description: encodePathDescriptionWithNativeTitle(path.title ?? "", path.description),
    benefits: path.benefits,
    consequences: path.consequences,
    future_shift: path.future_shift,
    themes: path.themes,
    sort_order: index,
  }));

  const { data: insertedPaths, error: pathsError } = await supabase.rpc(
    "commit_generated_paths",
    {
      p_moment_id: momentId,
      p_current_understanding: generated.current_understanding,
      p_opportunity_themes: generated.opportunity_themes,
      p_risk_themes: generated.risk_themes,
      p_paths: pathRows,
      p_timeline_summary: generated.current_understanding,
      p_timeline_metadata: {
        moment_id: momentId,
        moment_title: momentTitle,
        path_count: generated.paths.length,
        themes,
      },
    },
  );

  if (pathsError || !insertedPaths) {
    if (pathsError?.code === "23505") {
      return { error: "Paths have already been generated for this situation." };
    }
    return { error: pathsError?.message ?? "Failed to generate paths." };
  }

  return { paths: insertedPaths };
}

/**
 * Creates a single path record that is immediately chosen, for situations that
 * have already happened (Forecast Mode). No AI is involved — the path represents
 * the reality the user is already navigating.
 */
export async function createForecastModePath(
  momentId: string,
): Promise<{ path: Path } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .select("id, title")
    .eq("id", momentId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (momentError || !moment) {
    return { error: momentError?.message ?? "Moment not found." };
  }

  // Idempotent: a retry (resume after a dropped connection, or Resume
  // generation clicked twice) must not give the situation a second chosen
  // path. If one already exists, it is the one this call would have created.
  const { data: existingChosen } = await supabase
    .from("paths")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .eq("is_chosen", true)
    .maybeSingle();

  if (existingChosen) {
    return { path: existingChosen };
  }

  const chosenAt = new Date().toISOString();

  const { data: path, error: pathError } = await supabase
    .from("paths")
    .insert({
      moment_id: momentId,
      user_id: auth.userId,
      description: moment.title,
      future_shift: "",
      sort_order: 0,
      benefits: [],
      consequences: [],
      themes: [],
      is_chosen: true,
      chosen_at: chosenAt,
    })
    .select("*")
    .single();

  if (pathError || !path) {
    return { error: pathError?.message ?? "Failed to create path." };
  }

  await supabase.from("timeline_events").insert({
    user_id: auth.userId,
    event_type: "path_chosen",
    reference_type: "path",
    reference_id: path.id,
    title: "Path chosen",
    summary: moment.title,
    metadata: {
      moment_id: momentId,
      path_id: path.id,
      path_description: moment.title,
      themes: [],
    },
  });

  return { path };
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
    return { error: "A path has already been chosen for this situation." };
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

  // Atomic: marking the path chosen and recording the timeline event are
  // committed together inside commit_path_choice, so the path can never end up
  // chosen without its event (and no manual is_chosen revert is needed on a
  // partial failure).
  const { data: updatedPath, error: commitError } = await supabase.rpc(
    "commit_path_choice",
    {
      p_path_id: pathId,
      p_moment_id: momentId,
      p_chosen_at: chosenAt,
      p_summary: path.description,
      p_themes: path.themes,
    },
  );

  if (commitError || !updatedPath) {
    return { error: commitError?.message ?? "Failed to choose path." };
  }

  // Choosing a path for a situation is itself predictive evidence — not just
  // a record of intent — so it regenerates Future Selves, the same way
  // submitCheckIn() does for lived evidence. Phase 5C: this used to be
  // awaited here, blocking the response. It now runs via after(), scheduled
  // to execute once the response has been sent — the pipeline itself
  // (extraction → recognition → explanation → persistence → current self
  // regeneration) is unchanged, only WHEN it runs has moved.
  after(async () => {
    await queueFutureSelvesGeneration(momentId)
      .then((result) =>
        reportDiscardedResultError(
          "choosePath: Future Selves regeneration failed",
          result,
          { momentId },
        ),
      )
      .catch(
        swallowReporting("choosePath: Future Selves regeneration failed", {
          momentId,
        }),
      );
  });

  return { path: updatedPath };
}
