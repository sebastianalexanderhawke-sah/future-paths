"use server";

import { redirect } from "next/navigation";

import { swallowReporting } from "@/lib/observability";
import { createForecastModePath, listPathsForMoment } from "@/lib/paths";

import { decodeNativePathFields } from "@/components/home/path-native-title";

import { withJustChosenPathFlag } from "@/lib/forecast-visit-flag";

import { forecastOutputSchema } from "@/lib/ai/schemas/forecast";

import { runStructuredGeneration } from "@/lib/ai/orchestrator";

import { buildSelectedPathSummary } from "@/components/home/decision-simulator-utils";
import { toPathTitleInput } from "@/components/home/path-titles";

import {

  buildForecastSectionsFromGeneration,

  buildForecastSectionsWithTrace,

  formatForecastSituationSummary,

  type ForecastResult,

} from "@/components/home/forecast-utils";

import {

  buildForecastAuditFromSections,

  buildRawForecastAuditFromGeneration,

  computePreservationMetrics,

  isAiAuditEnabled,

  type ForecastAudit,

} from "@/lib/ai-audit";
import { buildForecastSimplificationExperiment } from "@/lib/forecast-simplification-experiment";

import { saveForecast } from "@/lib/forecasts";
import { createMoment, getMoment, updateMoment } from "@/lib/moments";

import { createClient } from "@/lib/supabase/server";

import type { ThemeName } from "@/types/enums";



export type FutureForecastSelectedPath = {

  id: string;

  title: string;

  description: string;

  benefits: string[];

  consequences: string[];

  future_shift: string;

  themes: ThemeName[];

};



export type FutureForecastResponse =

  // momentId is present on failure when the situation exists — it is never
  // deleted, so the caller can offer to resume generation against it instead
  // of creating a duplicate.
  | { error: string; result: null; momentId?: string }

  | { error: null; result: ForecastResult };



async function getAuthenticatedUserId(): Promise<{ userId: string } | { error: string }> {

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



function mergeContextSummary(

  contextSummary: string | null,

  selectedPathSummary: string | null,

): string | null {

  const parts = [contextSummary, selectedPathSummary].filter(

    (part): part is string => Boolean(part?.trim()),

  );



  return parts.length > 0 ? parts.join("\n\n") : null;

}



function buildSelectedPathText(selectedPath?: FutureForecastSelectedPath): string[] {

  if (!selectedPath) {

    return [];

  }



  return [

    toPathTitleInput(selectedPath).description,

    ...selectedPath.benefits,

    ...selectedPath.consequences,

    selectedPath.future_shift,

  ];

}



export async function runFutureForecastAction(input: {

  situationText: string;

  contextSummary: string | null;

  momentId?: string;

  selectedPath?: FutureForecastSelectedPath;

  clientToken?: string | null;

}): Promise<FutureForecastResponse> {

  const title = input.situationText.trim();



  if (!title) {

    return { error: "Situation text is required.", result: null };

  }



  const auth = await getAuthenticatedUserId();

  if ("error" in auth) {

    return { error: auth.error, result: null };

  }



  const selectedPathSummary = input.selectedPath

    ? buildSelectedPathSummary(input.selectedPath)

    : null;

  const mergedContextSummary = mergeContextSummary(input.contextSummary, selectedPathSummary);



  let momentId = input.momentId;

  if (momentId) {

    const existingMoment = await getMoment(momentId);

    if ("error" in existingMoment) {

      return { error: existingMoment.error, result: null };

    }



    if (mergedContextSummary && mergedContextSummary !== existingMoment.moment.description) {

      const updateResult = await updateMoment(momentId, {

        description: mergedContextSummary,

      });



      if ("error" in updateResult) {

        return { error: updateResult.error, result: null };

      }

    }

  } else {

    const momentResult = await createMoment({

      title,

      description: mergedContextSummary,

      clientToken: input.clientToken,

    });



    if ("error" in momentResult) {

      return { error: momentResult.error, result: null };

    }



    momentId = momentResult.moment.id;

  }



  const forecastGeneration = await runStructuredGeneration({

    userId: auth.userId,

    profile: "forecast",

    promptId: "forecast.generate",

    schema: forecastOutputSchema,

    overrides: {

      momentId,

      pathId: input.selectedPath?.id,

      selectedPathTitle: input.selectedPath?.title,

    },

  });



  // Failures past this point keep the situation: it holds the user's full
  // written context, and the caller can offer to resume generation against it
  // (the moment page's generate actions are the durable fallback). Deleting it
  // would destroy that context because an AI call failed.
  if (!forecastGeneration.ok) {

    console.error("[runFutureForecastAction] AI generation failed", {
      momentId,
      pathId: input.selectedPath?.id ?? null,
      error: forecastGeneration.error,
    });

    return { error: forecastGeneration.error, result: null, momentId };

  }



  if (forecastGeneration.data.current_understanding) {
    await updateMoment(momentId, {
      current_understanding: forecastGeneration.data.current_understanding,
    }).catch(
      swallowReporting("future-forecast action: current_understanding update failed", {
        momentId,
      }),
    );
  }

  const refreshedMoment = await getMoment(momentId);

  if ("error" in refreshedMoment) {

    return { error: refreshedMoment.error, result: null, momentId };

  }



  const pathText = buildSelectedPathText(input.selectedPath);

  const processedForecast = isAiAuditEnabled()
    ? buildForecastSectionsWithTrace(
        forecastGeneration.data,
        title,
        input.selectedPath?.title ?? null,
        mergedContextSummary,
        pathText,
      )
    : null;

  const sections = processedForecast ?? buildForecastSectionsFromGeneration(
    forecastGeneration.data,
    title,
    input.selectedPath?.title ?? null,
    mergedContextSummary,
    pathText,
  );

  const audit: ForecastAudit | undefined = isAiAuditEnabled()
    ? (() => {
        const rawForecast = buildRawForecastAuditFromGeneration(forecastGeneration.data);
        const simplification = buildForecastSimplificationExperiment({
          rawForecast,
          sections,
        });

        return {
          rawForecast,
          ...buildForecastAuditFromSections(sections, {
            pipelineTrace: processedForecast?.pipelineTrace,
            preservationMetrics: computePreservationMetrics({
              pipelineTrace: processedForecast?.pipelineTrace,
            }),
            integrityAudit: processedForecast?.integrityAudit,
            explanationAudit: processedForecast?.explanationAudit,
            simplificationAudit: simplification.audit,
            simplificationMetrics: simplification.metrics,
          }),
        };
      })()
    : undefined;

  const situationSummary = formatForecastSituationSummary(
    refreshedMoment.moment.description ?? title,
  );

  const saveResult = await saveForecast({
    userId: auth.userId,
    momentId,
    pathId: input.selectedPath?.id ?? null,
    sections,
    situationSummary,
  });

  if ("error" in saveResult) {
    console.error("[runFutureForecastAction] Failed to save forecast", {
      momentId,
      pathId: input.selectedPath?.id ?? null,
      error: saveResult.error,
    });

    return { error: `Failed to save forecast: ${saveResult.error}`, result: null, momentId };
  }

  return {

    error: null,

    result: {

      momentId,

      situationTitle: title,

      selectedPathTitle: input.selectedPath?.title,

      situationSummary,

      sections,

      ...(audit ? { audit } : {}),

    },

  };

}

export type ForecastModeResponse =
  // On failure, momentId is set when the situation exists (it is never
  // deleted) so the caller can offer to resume generation against it.
  | { error: string; momentId: string | null }
  | { error: null; momentId: string };

/**
 * Forecast Mode entry action: generates a forecast for a new situation,
 * then auto-creates and auto-chooses a single path so the situation enters
 * the standard check-in/reflection pipeline.
 */
export async function runForecastModeAction(input: {
  situationText: string;
  contextSummary: string | null;
  clientToken?: string | null;
}): Promise<ForecastModeResponse> {
  const forecastResponse = await runFutureForecastAction(input);

  if (forecastResponse.error) {
    return { error: forecastResponse.error, momentId: forecastResponse.momentId ?? null };
  }

  if (!forecastResponse.result) {
    return { error: "Forecast generation returned no result.", momentId: null };
  }

  const momentId = forecastResponse.result.momentId;

  const pathResult = await createForecastModePath(momentId);
  if ("error" in pathResult) {
    return { error: pathResult.error, momentId };
  }

  return { error: null, momentId };
}

/**
 * Server action for the Phase 1 fallback on the situation detail page.
 * Used for legacy moments that were created without a mode. Generates a
 * forecast for the existing moment, then auto-creates and auto-chooses a path.
 */
export async function generateForecastForMomentAction(
  formData: FormData,
): Promise<void> {
  const momentId = formData.get("momentId");
  if (typeof momentId !== "string" || !momentId.trim()) return;

  const momentResult = await getMoment(momentId);
  if ("error" in momentResult) {
    redirect("/moments");
  }

  const { moment } = momentResult;

  const forecastResponse = await runFutureForecastAction({
    situationText: moment.title,
    contextSummary: moment.description,
    momentId,
  });

  // Failures land on the situation page, which shows the error and keeps its
  // generate actions available — never a silent no-op the user can't see.
  if (forecastResponse.error || !forecastResponse.result) {
    redirect(
      `/moments/${momentId}?error=${encodeURIComponent(
        forecastResponse.error ?? "Forecast generation returned no result.",
      )}`,
    );
  }

  const pathResult = await createForecastModePath(momentId);
  if ("error" in pathResult) {
    redirect(`/moments/${momentId}?error=${encodeURIComponent(pathResult.error)}`);
  }

  redirect(withJustChosenPathFlag(`/moments/${momentId}`));
}

/**
 * Server action for the Possible Futures empty state on the situation detail
 * page: a path was chosen but its forecast never finished generating (the
 * original failure redirect was seen once and lost). Re-runs generation
 * against the existing chosen path — never creates or re-chooses paths.
 */
export async function regenerateForecastForChosenPathAction(
  formData: FormData,
): Promise<void> {
  const momentId = formData.get("momentId");
  if (typeof momentId !== "string" || !momentId.trim()) return;

  const momentResult = await getMoment(momentId);
  if ("error" in momentResult) {
    redirect("/moments");
  }
  const { moment } = momentResult;

  const pathsResult = await listPathsForMoment(momentId);
  const chosenPath =
    "error" in pathsResult
      ? null
      : (pathsResult.paths.find((path) => path.is_chosen) ?? null);

  let selectedPath: FutureForecastSelectedPath | undefined;
  if (chosenPath) {
    const { nativeTitle, description } = decodeNativePathFields(
      chosenPath.description,
    );
    selectedPath = {
      id: chosenPath.id,
      title: nativeTitle ?? chosenPath.description,
      description,
      benefits: chosenPath.benefits,
      consequences: chosenPath.consequences,
      future_shift: chosenPath.future_shift,
      themes: chosenPath.themes,
    };
  }

  const forecastResponse = await runFutureForecastAction({
    situationText: moment.title,
    contextSummary: moment.description,
    momentId,
    ...(selectedPath ? { selectedPath } : {}),
  });

  if (forecastResponse.error || !forecastResponse.result) {
    redirect(
      `/moments/${momentId}?error=${encodeURIComponent(
        forecastResponse.error ?? "Forecast generation returned no result.",
      )}`,
    );
  }

  redirect(withJustChosenPathFlag(`/moments/${momentId}`));
}

