import type { ScannableFuture, ScannablePath } from "@/components/home/output-refinement";
import type { ForecastOutput } from "@/lib/ai/schemas/forecast";
import type { MockCrossroadResult, MockPathDraft } from "@/lib/mock-crossroad-generator";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import type { Path } from "@/types/database";
import type { ThemeName } from "@/types/enums";

export type RawPathAudit = {
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
};

export type ProcessedForecastAudit = {
  active: ProcessedFutureAuditItem[];
  hidden: ProcessedFutureAuditItem[];
  blind_spots: ProcessedFutureAuditItem[];
};

export type DecisionSimulatorAudit = {
  rawPaths: RawPathAudit[];
};

export type ForecastAudit = {
  rawForecast: RawForecastAudit;
};

export function isAiAuditEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AI_AUDIT === "true";
}

type PathLike = Pick<
  Path,
  "description" | "benefits" | "consequences" | "future_shift" | "themes"
>;

export function toRawPathAudit(path: PathLike): RawPathAudit {
  return {
    description: path.description,
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
