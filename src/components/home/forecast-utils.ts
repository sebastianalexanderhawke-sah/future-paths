import type { MockCrossroadResult, MockPathDraft } from "@/lib/mock-crossroad-generator";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";

import type { ForecastOutput } from "@/lib/ai/schemas/forecast";

import {
  buildScannableForecastSections,
  type ScannableFuture,
  toFirstSentence,
  withScannableForecastFallbacks,
} from "@/components/home/output-refinement";
import { processGeneratedForecastSections } from "@/components/home/forecast-reality";

export type ForecastSections = {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
};

export type ForecastResult = {
  momentId: string;
  situationTitle: string;
  situationSummary: string;
  selectedPathTitle?: string;
  sections: ForecastSections;
  audit?: import("@/lib/ai-audit").ForecastAudit;
};

export function buildForecastSectionsFromGeneration(
  generated: ForecastOutput,
  situationTitle = "",
  selectedPathTitle?: string | null,
  contextSummary?: string | null,
  pathText: string[] = [],
): ForecastSections {
  const result = processGeneratedForecastSections(
    generated,
    situationTitle,
    contextSummary,
    selectedPathTitle,
    pathText,
  );

  return {
    activeFutures: result.activeFutures,
    hiddenFutures: result.hiddenFutures,
    blindSpotFutures: result.blindSpotFutures,
  };
}

export function buildForecastSectionsWithTrace(
  generated: ForecastOutput,
  situationTitle = "",
  selectedPathTitle?: string | null,
  contextSummary?: string | null,
  pathText: string[] = [],
) {
  return processGeneratedForecastSections(
    generated,
    situationTitle,
    contextSummary,
    selectedPathTitle,
    pathText,
    { collectPipelineTrace: true },
  );
}

export function buildForecastSections(
  crossroad: MockCrossroadResult,
  futureSelves: MockFutureSelfDraft[],
  situationTitle = "",
  selectedPath?: MockPathDraft | null,
  selectedPathTitle?: string,
  contextSummary?: string | null,
): ForecastSections {
  return buildScannableForecastSections(
    crossroad,
    futureSelves,
    situationTitle,
    selectedPath,
    selectedPathTitle,
    contextSummary,
  );
}

export function withForecastFallbacks(
  sections: ForecastSections,
  situationTitle: string,
): ForecastSections {
  return withScannableForecastFallbacks(sections, situationTitle);
}

export function formatForecastSituationSummary(summary: string): string {
  return toFirstSentence(summary);
}
