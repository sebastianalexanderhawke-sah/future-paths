import type { ScannableFuture, ScannablePath } from "@/components/home/output-refinement";
import type { PathTitleTraceItem } from "@/components/home/path-titles";
import { decodeNativePathFields } from "@/components/home/path-native-title";
import type { ForecastIntegrityAudit } from "@/lib/forecast-slot-integrity";
import type {
  ForecastSourceAttributionAudit,
  ForecastSourceMetrics,
} from "@/lib/forecast-source-attribution";
import {
  buildForecastSourceAttributionAudit,
  computeForecastSourceMetricsFromSections,
} from "@/lib/forecast-source-attribution";
import type {
  ForecastExplanationPreservationAudit,
  ForecastExplanationPreservationMetrics,
} from "@/lib/forecast-explanation-preservation";
import {
  buildForecastExplanationPreservationAudit,
  computeForecastExplanationPreservationMetrics,
} from "@/lib/forecast-explanation-preservation";
import type {
  FutureShiftPreservationAudit,
  FutureShiftPreservationMetrics,
} from "@/lib/future-shift-preservation";
import type {
  PathTextTransformationAudit,
  PathTextTransformationMetrics,
} from "@/lib/path-text-transformation-trace";
import type { ForecastOutput } from "@/lib/ai/schemas/forecast";
import type { MockCrossroadResult, MockPathDraft } from "@/lib/mock-crossroad-generator";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import type { Path } from "@/types/database";
import type { ThemeName } from "@/types/enums";

export type RawPathAudit = {
  title: string | null;
  description: string;
  benefits: string[];
  consequences: string[];
  future_shift: string;
  themes: ThemeName[];
};

export type ProcessedPathAudit = {
  title: string;
  explanation: string;
  benefits: string[];
  consequences: string[];
  futureYou: string;
};

export type RawFutureAuditItem = {
  title: string;
  whyItMightHappen?: string;
  signals?: string[];
  futureImpact?: string;
};

export type RawForecastAudit = {
  active: RawFutureAuditItem[];
  hidden: RawFutureAuditItem[];
  blind_spots: RawFutureAuditItem[];
};

export type ProcessedFutureAuditItem = {
  title: string;
  whyItMightHappen: string;
  signals: string[];
  futureImpact: string;
  sourceTrace?: string;
  source?: string;
  sourceStage?: string;
  originalTitle?: string | null;
};

export type ProcessedForecastAudit = {
  active: ProcessedFutureAuditItem[];
  hidden: ProcessedFutureAuditItem[];
  blind_spots: ProcessedFutureAuditItem[];
};

export type DecisionSimulatorAudit = {
  rawPaths: RawPathAudit[];
  textTransformationAudit?: PathTextTransformationAudit;
  textTransformationMetrics?: PathTextTransformationMetrics;
  futureShiftAudit?: FutureShiftPreservationAudit;
  futureShiftMetrics?: FutureShiftPreservationMetrics;
};

export type PreservationMetrics = {
  nativePathTitles: number;
  recoveredPathTitles: number;
  generatedPathTitles: number;
  preservedClaudeFutures: number;
  rewrittenFutures: number;
  recoveryGeneratedFutures: number;
  fallbackGeneratedFutures: number;
};

export type ForecastAudit = {
  rawForecast: RawForecastAudit;
  pipelineTrace?: ForecastPipelineTrace;
  preservationMetrics?: PreservationMetrics;
  integrityAudit?: ForecastIntegrityAudit;
  sourceAttribution?: ForecastSourceAttributionAudit;
  sourceMetrics?: ForecastSourceMetrics;
  explanationAudit?: ForecastExplanationPreservationAudit;
  explanationMetrics?: ForecastExplanationPreservationMetrics;
};

export type { ForecastIntegrityAudit, ForecastSectionIntegrity, ForecastSlotIntegrityItem } from "@/lib/forecast-slot-integrity";
export type {
  ForecastFutureSource,
  ForecastSourceAttribution,
  ForecastSourceAttributionAudit,
  ForecastSourceMetrics,
} from "@/lib/forecast-source-attribution";
export type {
  PathTextFieldTrace,
  PathTextTransformationAudit,
  PathTextTransformationMetrics,
  PathTextTransformationStatus,
  PathTextTransformationTrace,
} from "@/lib/path-text-transformation-trace";
export type {
  FutureShiftAuditItem,
  FutureShiftPreservationAudit,
  FutureShiftPreservationMetrics,
  FutureShiftPreservationStatus,
  FutureShiftValidationResult,
} from "@/lib/future-shift-preservation";
export type {
  ForecastExplanationPreservationAudit,
  ForecastExplanationPreservationItem,
  ForecastExplanationPreservationMetrics,
  ForecastExplanationPreservationStatus,
  ForecastExplanationValidationResult,
} from "@/lib/forecast-explanation-preservation";

export type ForecastPipelineTraceStatus =
  | "preserved"
  | "rewritten"
  | "removed"
  | "recovered"
  | "fallback";

export type ForecastPipelineTraceGeneratedBy = "claude" | "recovery" | "fallback";

export type ForecastPipelineTraceItem = {
  original: string;
  afterReality?: string | null;
  afterGrounding?: string | null;
  afterRewrite?: string | null;
  afterRecovery?: string | null;
  final?: string | null;
  status: ForecastPipelineTraceStatus;
  reason?: string;
  generatedBy?: ForecastPipelineTraceGeneratedBy;
};

export type ForecastPipelineTrace = {
  active: ForecastPipelineTraceItem[];
  hidden: ForecastPipelineTraceItem[];
  blind_spots: ForecastPipelineTraceItem[];
};

export function isAiAuditEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_AUDIT === "true";
}

type PathLike = Pick<
  Path,
  "description" | "benefits" | "consequences" | "future_shift" | "themes"
>;

export function toRawPathAudit(path: PathLike): RawPathAudit {
  const { nativeTitle, description } = decodeNativePathFields(path.description);

  return {
    title: nativeTitle,
    description,
    benefits: [...path.benefits],
    consequences: [...path.consequences],
    future_shift: path.future_shift,
    themes: [...path.themes],
  };
}

export function toRawPathsAudit(paths: PathLike[]): RawPathAudit[] {
  return paths.map(toRawPathAudit);
}

export function toProcessedPathAudit(path: ScannablePath): ProcessedPathAudit {
  return {
    title: path.title,
    explanation: path.explanation,
    benefits: [...path.benefits],
    consequences: [...path.consequences],
    futureYou: path.futureYou,
  };
}

function toRawFutureItem(source: string): RawFutureAuditItem {
  const trimmed = source.trim();
  return {
    title: trimmed,
    futureImpact: trimmed,
  };
}

export function buildRawForecastAuditFromGeneration(generated: ForecastOutput): RawForecastAudit {
  const mapFuture = (future: { title: string; why: string; impact: string }): RawFutureAuditItem => ({
    title: future.title,
    whyItMightHappen: future.why,
    futureImpact: future.impact,
  });

  return {
    active: generated.active.map(mapFuture),
    hidden: generated.hidden.map(mapFuture),
    blind_spots: generated.blind_spots.map(mapFuture),
  };
}

export function buildRawForecastAudit(
  crossroad: MockCrossroadResult,
  futureSelves: MockFutureSelfDraft[],
  selectedPath?: MockPathDraft | null,
): RawForecastAudit {
  const paths = selectedPath ? [selectedPath] : crossroad.paths;

  return {
    active: paths.flatMap((path) => path.benefits.map(toRawFutureItem)),
    hidden: paths.flatMap((path) => path.consequences.map(toRawFutureItem)),
    blind_spots: [
      ...paths.map((path) => toRawFutureItem(path.future_shift)),
      ...futureSelves.map((futureSelf) =>
        toRawFutureItem(`${futureSelf.name}: ${futureSelf.description}`),
      ),
    ],
  };
}

export function toProcessedFutureAuditItem(future: ScannableFuture): ProcessedFutureAuditItem {
  return {
    title: future.title,
    whyItMightHappen: future.whyItMightHappen,
    signals: [...future.signals],
    futureImpact: future.futureImpact,
    ...(future.sourceTrace ? { sourceTrace: future.sourceTrace } : {}),
    ...(future.source ? { source: future.source } : {}),
    ...(future.sourceStage ? { sourceStage: future.sourceStage } : {}),
    ...(future.originalTitle !== undefined ? { originalTitle: future.originalTitle } : {}),
  };
}

export function toProcessedForecastAudit(sections: {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
}): ProcessedForecastAudit {
  return {
    active: sections.activeFutures.map(toProcessedFutureAuditItem),
    hidden: sections.hiddenFutures.map(toProcessedFutureAuditItem),
    blind_spots: sections.blindSpotFutures.map(toProcessedFutureAuditItem),
  };
}

export function buildForecastAuditFromSections(
  sections: {
    activeFutures: ScannableFuture[];
    hiddenFutures: ScannableFuture[];
    blindSpotFutures: ScannableFuture[];
  },
  extras?: {
    pipelineTrace?: ForecastPipelineTrace;
    preservationMetrics?: PreservationMetrics;
    integrityAudit?: ForecastIntegrityAudit;
    explanationAudit?: ForecastExplanationPreservationAudit;
  },
): Pick<
  ForecastAudit,
  | "sourceAttribution"
  | "sourceMetrics"
  | "pipelineTrace"
  | "preservationMetrics"
  | "integrityAudit"
  | "explanationAudit"
  | "explanationMetrics"
> {
  const explanationAudit =
    extras?.explanationAudit ?? buildForecastExplanationPreservationAudit(sections);

  return {
    sourceAttribution: buildForecastSourceAttributionAudit(sections),
    sourceMetrics: computeForecastSourceMetricsFromSections(sections),
    explanationAudit,
    explanationMetrics: computeForecastExplanationPreservationMetrics(explanationAudit),
    ...extras,
  };
}

export function computePreservationMetrics(input: {
  pathTitleTraces?: PathTitleTraceItem[];
  pipelineTrace?: ForecastPipelineTrace;
}): PreservationMetrics {
  const metrics: PreservationMetrics = {
    nativePathTitles: 0,
    recoveredPathTitles: 0,
    generatedPathTitles: 0,
    preservedClaudeFutures: 0,
    rewrittenFutures: 0,
    recoveryGeneratedFutures: 0,
    fallbackGeneratedFutures: 0,
  };

  for (const trace of input.pathTitleTraces ?? []) {
    if (trace.status === "native") {
      metrics.nativePathTitles += 1;
    } else if (trace.status === "recovered") {
      metrics.recoveredPathTitles += 1;
    } else if (trace.status === "generated") {
      metrics.generatedPathTitles += 1;
    }
  }

  for (const section of ["active", "hidden", "blind_spots"] as const) {
    for (const item of input.pipelineTrace?.[section] ?? []) {
      if (item.status === "preserved" && item.generatedBy === "claude") {
        metrics.preservedClaudeFutures += 1;
      } else if (item.status === "rewritten" && item.generatedBy === "claude") {
        metrics.rewrittenFutures += 1;
      } else if (item.status === "recovered") {
        metrics.recoveryGeneratedFutures += 1;
      } else if (item.status === "fallback") {
        metrics.fallbackGeneratedFutures += 1;
      }
    }
  }

  return metrics;
}
