import { createClient } from "@/lib/supabase/server";
import { runStreamingGeneration } from "@/lib/ai/stream";
import { forecastOutputSchema } from "@/lib/ai/schemas/forecast";
import { createArrayItemParser } from "@/lib/ai/parse-stream";
import { buildSelectedPathSummary } from "@/components/home/decision-simulator-utils";
import { toPathTitleInput } from "@/components/home/path-titles";
import {
  buildForecastSectionsFromGeneration,
  buildForecastSectionsWithTrace,
  formatForecastSituationSummary,
} from "@/components/home/forecast-utils";
import {
  buildForecastAuditFromSections,
  buildRawForecastAuditFromGeneration,
  computePreservationMetrics,
  isAiAuditEnabled,
} from "@/lib/ai-audit";
import { buildForecastSimplificationExperiment } from "@/lib/forecast-simplification-experiment";
import { saveForecast } from "@/lib/forecasts";
import { getMoment, createMoment, updateMoment } from "@/lib/moments";
import type { ThemeName } from "@/types/enums";

type SelectedPath = {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  consequences: string[];
  future_shift: string;
  themes: ThemeName[];
};

function mergeContextSummary(
  contextSummary: string | null,
  selectedPathSummary: string | null,
): string | null {
  const parts = [contextSummary, selectedPathSummary].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  return parts.length > 0 ? parts.join("\n\n") : null;
}

function buildSelectedPathText(selectedPath?: SelectedPath): string[] {
  if (!selectedPath) return [];
  return [
    toPathTitleInput(selectedPath).description,
    ...selectedPath.benefits,
    ...selectedPath.consequences,
    selectedPath.future_shift,
  ];
}

function sseData(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const FORECAST_SECTION_KEYS = ["active", "hidden", "blind_spots", "wild_card"] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.situationText !== "string" || !body.situationText.trim()) {
    return Response.json({ error: "situationText is required" }, { status: 400 });
  }

  const { situationText, contextSummary, momentId: inputMomentId, selectedPath } = body as {
    situationText: string;
    contextSummary: string | null;
    momentId?: string;
    selectedPath?: SelectedPath;
  };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const title = situationText.trim();
  const selectedPathSummary = selectedPath ? buildSelectedPathSummary(selectedPath) : null;
  const mergedContextSummary = mergeContextSummary(contextSummary, selectedPathSummary);

  let momentId = inputMomentId;

  if (momentId) {
    const existingMoment = await getMoment(momentId);
    if ("error" in existingMoment) {
      return Response.json({ error: existingMoment.error }, { status: 500 });
    }

    if (
      mergedContextSummary &&
      mergedContextSummary !== existingMoment.moment.description
    ) {
      const updateResult = await updateMoment(momentId, {
        description: mergedContextSummary,
      });
      if ("error" in updateResult) {
        return Response.json({ error: updateResult.error }, { status: 500 });
      }
    }
  } else {
    const momentResult = await createMoment({ title, description: mergedContextSummary });
    if ("error" in momentResult) {
      return Response.json({ error: momentResult.error }, { status: 500 });
    }
    momentId = momentResult.moment.id;
  }

  const resolvedMomentId = momentId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: unknown) => {
        controller.enqueue(encoder.encode(sseData(event)));
        controller.enqueue(encoder.encode(": ping\n\n"));
      };

      try {
        const futureParser = createArrayItemParser([...FORECAST_SECTION_KEYS], (item, key) => {
          enqueue({ type: "future", data: { ...(item as object), section: key } });
        });

        const forecastGeneration = await runStreamingGeneration(
          {
            userId: user.id,
            profile: "forecast",
            promptId: "forecast.generate",
            schema: forecastOutputSchema,
            overrides: {
              momentId: resolvedMomentId,
              pathId: selectedPath?.id,
              selectedPathTitle: selectedPath?.title,
            },
          },
          (text) => futureParser(text),
        );

        if (!forecastGeneration.ok) {
          enqueue({ type: "error", error: forecastGeneration.error });
          return;
        }

        if (forecastGeneration.data.current_understanding) {
          await updateMoment(resolvedMomentId, {
            current_understanding: forecastGeneration.data.current_understanding,
          }).catch(() => {});
        }

        const refreshedMoment = await getMoment(resolvedMomentId);
        if ("error" in refreshedMoment) {
          enqueue({ type: "error", error: refreshedMoment.error });
          return;
        }

        const pathText = buildSelectedPathText(selectedPath);
        const processedForecast = isAiAuditEnabled()
          ? buildForecastSectionsWithTrace(
              forecastGeneration.data,
              title,
              selectedPath?.title ?? null,
              mergedContextSummary,
              pathText,
            )
          : null;

        const sections =
          processedForecast ??
          buildForecastSectionsFromGeneration(
            forecastGeneration.data,
            title,
            selectedPath?.title ?? null,
            mergedContextSummary,
            pathText,
          );

        const audit = isAiAuditEnabled()
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
          userId: user.id,
          momentId: resolvedMomentId,
          pathId: selectedPath?.id ?? null,
          sections,
          situationSummary,
        });

        if ("error" in saveResult) {
          enqueue({ type: "error", error: `Failed to save forecast: ${saveResult.error}` });
          return;
        }

        enqueue({
          type: "result",
          data: {
            momentId: resolvedMomentId,
            situationTitle: title,
            selectedPathTitle: selectedPath?.title,
            situationSummary,
            sections,
            ...(audit ? { audit } : {}),
          },
        });
      } catch (error) {
        enqueue({
          type: "error",
          error: error instanceof Error ? error.message : "An error occurred",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
