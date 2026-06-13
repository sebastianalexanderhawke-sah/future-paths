import type { ScannableFuture } from "@/components/home/output-refinement";

export type ForecastFutureSource =
  | "claude"
  | "recovery"
  | "fallback"
  | "future_self"
  | "merge"
  | "unknown";

export type ForecastSourceAttribution = {
  title: string;
  source: ForecastFutureSource;
  sourceStage: string;
  originalTitle: string | null;
};

export type ForecastSourceAttributionAudit = {
  active: ForecastSourceAttribution[];
  hidden: ForecastSourceAttribution[];
  blind_spots: ForecastSourceAttribution[];
};

export type ForecastSourceMetrics = {
  claude: number;
  recovery: number;
  fallback: number;
  future_self: number;
  merge: number;
  unknown: number;
  total: number;
  percentages: {
    claude: number;
    recovery: number;
    fallback: number;
    future_self: number;
    merge: number;
    unknown: number;
  };
};

export function tagForecastFuture(
  future: ScannableFuture,
  source: ForecastFutureSource,
  sourceStage: string,
  originalTitle: string | null = null,
): ScannableFuture {
  return {
    ...future,
    source,
    sourceStage,
    originalTitle,
  };
}

export function toForecastSourceAttribution(future: ScannableFuture): ForecastSourceAttribution {
  return {
    title: future.title,
    source: future.source ?? "unknown",
    sourceStage: future.sourceStage ?? "unknown",
    originalTitle: future.originalTitle ?? null,
  };
}

export function buildForecastSourceAttributionAudit(sections: {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
}): ForecastSourceAttributionAudit {
  return {
    active: sections.activeFutures.map(toForecastSourceAttribution),
    hidden: sections.hiddenFutures.map(toForecastSourceAttribution),
    blind_spots: sections.blindSpotFutures.map(toForecastSourceAttribution),
  };
}

function roundPercentage(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

export function computeForecastSourceMetrics(
  attributions: ForecastSourceAttribution[],
): ForecastSourceMetrics {
  const counts = {
    claude: 0,
    recovery: 0,
    fallback: 0,
    future_self: 0,
    merge: 0,
    unknown: 0,
  };

  for (const item of attributions) {
    counts[item.source] += 1;
  }

  const total = attributions.length;

  return {
    ...counts,
    total,
    percentages: {
      claude: roundPercentage(counts.claude, total),
      recovery: roundPercentage(counts.recovery, total),
      fallback: roundPercentage(counts.fallback, total),
      future_self: roundPercentage(counts.future_self, total),
      merge: roundPercentage(counts.merge, total),
      unknown: roundPercentage(counts.unknown, total),
    },
  };
}

export function computeForecastSourceMetricsFromSections(sections: {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
}): ForecastSourceMetrics {
  const audit = buildForecastSourceAttributionAudit(sections);
  const allAttributions = [
    ...audit.active,
    ...audit.hidden,
    ...audit.blind_spots,
  ];

  return computeForecastSourceMetrics(allAttributions);
}
