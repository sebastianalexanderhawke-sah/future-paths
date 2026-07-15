import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import {
  emergingSituationOutputSchema,
  type EmergingSituationResult,
} from "@/lib/ai/schemas/emerging-situation";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { reportError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { EmergingSituationSuggestion } from "@/types/database";

/**
 * "Consistently" needs a pattern, and a pattern needs history: detection
 * never runs before a situation has this many check-ins, so early entries
 * can't trigger a suggestion (and no AI quota is spent on them).
 */
export const MIN_CHECK_INS_FOR_EMERGING_DETECTION = 3;

/**
 * Only unmistakable detections become suggestions — the callout asks the
 * user to consider splitting their story, and a low-confidence nudge to do
 * that is worse than silence.
 */
export function shouldSurfaceEmergingSituation(
  result: EmergingSituationResult,
): result is EmergingSituationResult & {
  suggested_title: string;
  suggested_description: string;
} {
  return (
    result.new_story_detected &&
    result.confidence === "high" &&
    !!result.suggested_title?.trim() &&
    !!result.suggested_description?.trim()
  );
}

/**
 * Runs emerging-story detection for one situation and stores a suggestion on
 * the moment when (and only when) the AI reports high confidence.
 *
 * Called from background enrichment (after a check-in or reflection answer),
 * so it never throws: every failure is reported and swallowed — a missed
 * detection re-runs on the next entry.
 *
 * Skips without spending AI quota when:
 * - the situation is not active,
 * - a suggestion already exists (it is showing, or was dismissed — "Dismiss"
 *   means this situation is never nagged about again),
 * - the situation has fewer than MIN_CHECK_INS_FOR_EMERGING_DETECTION
 *   check-ins.
 */
export async function maybeDetectEmergingSituation(
  userId: string,
  momentId: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: moment } = await supabase
      .from("moments")
      .select("id, status, emerging_situation, emerging_situation_dismissed_at")
      .eq("id", momentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (
      !moment ||
      moment.status !== "active" ||
      moment.emerging_situation !== null ||
      moment.emerging_situation_dismissed_at !== null
    ) {
      return;
    }

    const { count } = await supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("moment_id", momentId)
      .eq("user_id", userId);

    if ((count ?? 0) < MIN_CHECK_INS_FOR_EMERGING_DETECTION) {
      return;
    }

    const result = await runStructuredGeneration({
      userId,
      profile: "emerging_situation",
      promptId: "emerging_situation.detect",
      schema: emergingSituationOutputSchema,
      overrides: { momentId },
    });

    // A failed or below-threshold run leaves no trace: the next entry
    // re-evaluates with more evidence.
    if (!result.ok || !shouldSurfaceEmergingSituation(result.data)) {
      return;
    }

    const suggestion: EmergingSituationSuggestion = {
      title: result.data.suggested_title.trim(),
      description: result.data.suggested_description.trim(),
      detected_at: new Date().toISOString(),
      source_check_in_id: null,
    };

    // Guarded on the column still being null so a concurrent enrichment run
    // can't overwrite a suggestion (or a dismissal that landed in between).
    const { error: updateError } = await supabase
      .from("moments")
      .update({ emerging_situation: suggestion })
      .eq("id", momentId)
      .eq("user_id", userId)
      .is("emerging_situation", null)
      .is("emerging_situation_dismissed_at", null);

    if (updateError) {
      await reportError(
        "maybeDetectEmergingSituation: failed to store suggestion",
        updateError.message,
        { momentId },
      );
      return;
    }

    await captureServerEvent(userId, ANALYTICS_EVENTS.emergingSituationSuggested, {
      moment_id: momentId,
    });
  } catch (error) {
    await reportError("maybeDetectEmergingSituation: detection failed", error, {
      momentId,
    });
  }
}

/**
 * "Dismiss": records the dismissal so the callout never returns for this
 * situation. The stored suggestion is kept (not cleared) as the record of
 * what was suggested and declined.
 */
export async function dismissEmergingSituation(
  momentId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("moments")
    .update({ emerging_situation_dismissed_at: new Date().toISOString() })
    .eq("id", momentId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  await captureServerEvent(user.id, ANALYTICS_EVENTS.emergingSituationDismissed, {
    moment_id: momentId,
  });

  return { ok: true };
}
