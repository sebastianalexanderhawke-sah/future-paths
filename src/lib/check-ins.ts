import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { checkInOutputSchema } from "@/lib/ai/schemas/check-in";
import { forecastOutputSchema } from "@/lib/ai/schemas/forecast";
import {
  buildForecastSectionsFromGeneration,
  formatForecastSituationSummary,
} from "@/components/home/forecast-utils";
import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import { hasForecastForMomentAndPath, saveForecast } from "@/lib/forecasts";
import { queueFutureSelvesGeneration } from "@/lib/future-selves";
import { createIdentityUpdateIfMeaningful } from "@/lib/identity-updates";
import { evaluateReflectionQuestion } from "@/lib/reflection-question";
import { createClient } from "@/lib/supabase/server";
import type { CheckIn } from "@/types/database";

const REFLECTION_MAX_LENGTH = 5000;

/**
 * Returns a map of momentId → most-recent check-in created_at for the given
 * set of moments. Safe to call with an empty array.
 */
export async function getLastCheckInsForMoments(
  momentIds: string[],
): Promise<Record<string, string>> {
  if (momentIds.length === 0) return {};

  const auth = await requireUser();
  if ("error" in auth) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("check_ins")
    .select("moment_id, created_at")
    .in("moment_id", momentIds)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (!data) return {};

  const result: Record<string, string> = {};
  for (const row of data) {
    if (!(row.moment_id in result)) {
      result[row.moment_id] = row.created_at;
    }
  }
  return result;
}

/**
 * Returns a map of momentId → most-recent check-in (date + reality_summary)
 * for the given moments. Used by the homepage "Recent reality" section.
 * Safe to call with an empty array.
 */
export async function getLastCheckInRealityForMoments(
  momentIds: string[],
): Promise<Record<string, { created_at: string; reality_summary: string }>> {
  if (momentIds.length === 0) return {};

  const auth = await requireUser();
  if ("error" in auth) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("check_ins")
    .select("moment_id, created_at, reality_summary")
    .in("moment_id", momentIds)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (!data) return {};

  const result: Record<string, { created_at: string; reality_summary: string }> = {};
  for (const row of data) {
    if (!(row.moment_id in result)) {
      result[row.moment_id] = {
        created_at: row.created_at,
        reality_summary: row.reality_summary,
      };
    }
  }
  return result;
}

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

function validateReflection(reflection: string): string | null {
  const trimmed = reflection.trim();

  if (!trimmed) {
    return "Reflection is required.";
  }

  if (trimmed.length > REFLECTION_MAX_LENGTH) {
    return `Reflection must be ${REFLECTION_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export async function listCheckInsForMoment(
  momentId: string,
): Promise<{ checkIns: CheckIn[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { checkIns: data };
}

export async function createCheckIn(
  momentId: string,
  reflection: string,
  clientToken?: string | null,
): Promise<{ checkIn: CheckIn } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const reflectionError = validateReflection(reflection);
  if (reflectionError) {
    return { error: reflectionError };
  }

  const trimmedReflection = reflection.trim();
  const supabase = await createClient();

  // Idempotency: if this exact submission was already recorded (same client
  // token), return the existing check-in instead of running the AI pipeline and
  // creating a duplicate. This short-circuits the common double-submit / retry
  // case before any expensive work; the unique index on (user_id, client_token)
  // is the backstop for the truly-concurrent case (handled at insert below).
  if (clientToken) {
    const { data: existing } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("client_token", clientToken)
      .maybeSingle();

    if (existing) {
      return { checkIn: existing };
    }
  }

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

  const { data: chosenPath, error: pathError } = await supabase
    .from("paths")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .eq("is_chosen", true)
    .maybeSingle();

  if (pathError) {
    return { error: pathError.message };
  }

  if (!chosenPath) {
    return { error: "Choose a path before checking in." };
  }

  const { count, error: countError } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId);

  if (countError) {
    return { error: countError.message };
  }

  const isFirstCheckIn = (count ?? 0) === 0;

  const generationResult = await runStructuredGeneration({
    userId: auth.userId,
    profile: "check_in",
    promptId: "check_in.generate",
    schema: checkInOutputSchema,
    overrides: {
      momentId,
      pathId: chosenPath.id,
      reflection: trimmedReflection,
    },
  });

  if (!generationResult.ok) {
    return { error: generationResult.error };
  }

  const generated = generationResult.data;

  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .insert({
      user_id: auth.userId,
      moment_id: momentId,
      path_id: chosenPath.id,
      reflection: trimmedReflection,
      reality_summary: generated.reality_summary,
      theme_changes: generated.theme_changes,
      identity_impact: generated.identity_impact,
      client_token: clientToken ?? null,
    })
    .select("*")
    .single();

  if (checkInError || !checkIn) {
    // A concurrent submission with the same token won the race and already
    // created the check-in; the unique index rejects this one. Return the
    // winner so the request is idempotent rather than an error.
    if (checkInError?.code === "23505" && clientToken) {
      const { data: existing } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", auth.userId)
        .eq("client_token", clientToken)
        .maybeSingle();

      if (existing) {
        return { checkIn: existing };
      }
    }

    return { error: checkInError?.message ?? "Failed to create check-in." };
  }

  const { error: timelineError } = await supabase.from("timeline_events").insert({
    user_id: auth.userId,
    event_type: "check_in_recorded",
    reference_type: "check_in",
    reference_id: checkIn.id,
    title: "Reality recorded",
    summary: generated.reality_summary,
    metadata: {
      moment_id: momentId,
      path_id: chosenPath.id,
      check_in_id: checkIn.id,
      theme_changes: generated.theme_changes,
      identity_impact: generated.identity_impact,
    },
  });

  if (timelineError) {
    return { error: timelineError.message };
  }

  if (isFirstCheckIn || !chosenPath.is_locked) {
    const { error: lockError } = await supabase
      .from("paths")
      .update({ is_locked: true })
      .eq("id", chosenPath.id)
      .eq("user_id", auth.userId)
      .eq("is_locked", false);

    if (lockError) {
      return { error: lockError.message };
    }
  }

  // The check-in itself (row, timeline event, path lock) is committed above —
  // that is the work the user is waiting on. Everything below is downstream
  // enrichment (identity update, forecast regeneration, reflection question,
  // Future Selves, Current Self): each stage is idempotent or debounced and
  // none changes the response, so it runs via after(), once the response has
  // been sent. The stages run sequentially inside one callback in the exact
  // order they previously ran on the request path, preserving their ordering
  // guarantees; queueFutureSelvesGeneration keeps its own per-user in-process
  // chain and cross-instance lock.
  const userId = auth.userId;
  after(async () => {
    try {
      await createIdentityUpdateIfMeaningful({
        userId,
        moment: { id: moment.id, title: moment.title },
        checkIn,
      });

      // Trigger forecast regeneration if a path-specific forecast already exists.
      const shouldRegenerate = await hasForecastForMomentAndPath(
        momentId,
        chosenPath.id,
        userId,
      );

      if (shouldRegenerate) {
        const { data: allCheckIns } = await supabase
          .from("check_ins")
          .select("reality_summary, created_at")
          .eq("moment_id", momentId)
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        const checkInHistory = (allCheckIns ?? []).map((ci) => ci.reality_summary);

        const regenResult = await runStructuredGeneration({
          userId,
          profile: "forecast",
          promptId: "forecast.generate",
          schema: forecastOutputSchema,
          overrides: {
            momentId,
            pathId: chosenPath.id,
            checkInHistory,
          },
        });

        if (regenResult.ok) {
          const regenSections = buildForecastSectionsFromGeneration(
            regenResult.data,
            moment.title,
            null,
            moment.description,
            [],
          );
          const situationSummary = formatForecastSituationSummary(
            moment.description ?? moment.title,
          );
          await saveForecast({
            userId,
            momentId,
            pathId: chosenPath.id,
            sections: regenSections,
            situationSummary,
          }).catch(() => {});
        }
      }

      const reflectionEvaluation = await evaluateReflectionQuestion(
        userId,
        trimmedReflection,
        generated.reality_summary,
      ).catch(() => null);

      if (reflectionEvaluation?.should_reflect && reflectionEvaluation.question) {
        const { error: reflectionUpdateError } = await supabase
          .from("check_ins")
          .update({ reflection_question: reflectionEvaluation.question })
          .eq("id", checkIn.id)
          .eq("user_id", userId);

        if (reflectionUpdateError) {
          console.error("[createCheckIn] Failed to persist reflection_question:", reflectionUpdateError.message);
        }
      }

      // Check-ins are lived evidence — the strongest signal Future Selves
      // respond to — so every check-in always triggers a regeneration. The
      // trigger identifies this check-in so generation extracts its behavior
      // observations (once) before recognition runs.
      await queueFutureSelvesGeneration(momentId, {
        checkInId: checkIn.id,
        source: "check_in",
      }).catch(() => {});
      await requestCurrentSelfRegeneration(userId);
    } catch (error) {
      console.error(
        "[createCheckIn] Background enrichment failed:",
        error instanceof Error ? error.message : error,
      );
    }
  });

  revalidatePath(`/moments/${momentId}`);

  return { checkIn };
}
