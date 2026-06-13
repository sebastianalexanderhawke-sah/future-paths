"use server";



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

  | { error: string; result: null }

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



  if (!forecastGeneration.ok) {

    return { error: forecastGeneration.error, result: null };

  }



  const refreshedMoment = await getMoment(momentId);

  if ("error" in refreshedMoment) {

    return { error: refreshedMoment.error, result: null };

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
    ? {
        rawForecast: buildRawForecastAuditFromGeneration(forecastGeneration.data),
        ...buildForecastAuditFromSections(sections, {
          pipelineTrace: processedForecast?.pipelineTrace,
          preservationMetrics: computePreservationMetrics({
            pipelineTrace: processedForecast?.pipelineTrace,
          }),
          integrityAudit: processedForecast?.integrityAudit,
          explanationAudit: processedForecast?.explanationAudit,
        }),
      }
    : undefined;



  return {

    error: null,

    result: {

      momentId,

      situationTitle: title,

      selectedPathTitle: input.selectedPath?.title,

      situationSummary: formatForecastSituationSummary(

        refreshedMoment.moment.description ?? title,

      ),

      sections,

      ...(audit ? { audit } : {}),

    },

  };

}

