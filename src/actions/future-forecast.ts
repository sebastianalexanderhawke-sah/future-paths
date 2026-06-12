"use server";

import { crossroadOutputSchema } from "@/lib/ai/schemas/crossroad";
import { futureSelfDiscoverOutputSchema } from "@/lib/ai/schemas/future-self";
import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { buildSelectedPathSummary } from "@/components/home/decision-simulator-utils";
import {
  buildForecastSections,
  formatForecastSituationSummary,
  type ForecastResult,
  withForecastFallbacks,
} from "@/components/home/forecast-utils";
import {
  buildRawForecastAudit,
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

  const [crossroadGeneration, futureSelfGeneration] = await Promise.all([
    runStructuredGeneration({
      userId: auth.userId,
      profile: "crossroad",
      promptId: "crossroad.generate",
      schema: crossroadOutputSchema,
      overrides: { momentId },
    }),
    runStructuredGeneration({
      userId: auth.userId,
      profile: "future_self",
      promptId: "future_self.discover",
      schema: futureSelfDiscoverOutputSchema,
    }),
  ]);

  if (!crossroadGeneration.ok) {
    return { error: crossroadGeneration.error, result: null };
  }

  if (!futureSelfGeneration.ok) {
    return { error: futureSelfGeneration.error, result: null };
  }

  const refreshedMoment = await getMoment(momentId);
  if ("error" in refreshedMoment) {
    return { error: refreshedMoment.error, result: null };
  }

  const selectedPathDraft = input.selectedPath
    ? {
        description: input.selectedPath.description,
        benefits: input.selectedPath.benefits,
        consequences: input.selectedPath.consequences,
        future_shift: input.selectedPath.future_shift,
        themes: input.selectedPath.themes,
      }
    : null;

  const sections = withForecastFallbacks(
    buildForecastSections(
      crossroadGeneration.data,
      futureSelfGeneration.data,
      title,
      selectedPathDraft,
      input.selectedPath?.title,
      mergedContextSummary,
    ),
    input.selectedPath ? `${title} — ${input.selectedPath.title}` : title,
  );

  const audit: ForecastAudit | undefined = isAiAuditEnabled()
    ? {
        rawForecast: buildRawForecastAudit(
          crossroadGeneration.data,
          futureSelfGeneration.data,
          selectedPathDraft,
        ),
      }
    : undefined;

  return {
    error: null,
    result: {
      momentId,
      situationTitle: title,
      selectedPathTitle: input.selectedPath?.title,
      situationSummary: formatForecastSituationSummary(
        refreshedMoment.moment.description ??
          crossroadGeneration.data.current_understanding,
      ),
      sections,
      ...(audit ? { audit } : {}),
    },
  };
}
