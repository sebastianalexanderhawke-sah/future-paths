import type { RawFutureAuditItem, RawForecastAudit } from "@/lib/ai-audit";
import type { ScannableFuture } from "@/components/home/output-refinement";

export type ForecastSimplificationSection = "active" | "hidden" | "blind_spots";

export type SimplifiedFutureRendering = {
  title: string;
  whyItMightHappen: string;
  futureImpact: string;
};

export type CurrentFutureRendering = {
  title: string;
  whyItMightHappen: string;
  signals: string[];
  sourceTrace?: string;
  futureImpact: string;
  expansion?: string | null;
};

export type ForecastSimplificationItem = {
  section: ForecastSimplificationSection;
  index: number;
  displayedTitle: string;
  raw: SimplifiedFutureRendering | null;
  current: CurrentFutureRendering;
  rawCharacters: number;
  displayedCharacters: number;
  signalCharacters: number;
  traceCharacters: number;
  characterDelta: number;
  displayExpansionRatio: number | null;
  hasRawClaude: boolean;
};

export type ForecastSimplificationAudit = {
  active: ForecastSimplificationItem[];
  hidden: ForecastSimplificationItem[];
  blind_spots: ForecastSimplificationItem[];
};

export type ForecastSimplificationMetrics = {
  rawClaudeCharacters: number;
  displayedCharacters: number;
  signalCharacters: number;
  traceCharacters: number;
  displayExpansionRatio: number;
  matchedFutures: number;
  totalDisplayedFutures: number;
};

function normalizeMatchKey(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

function countCharacters(parts: Array<string | null | undefined>): number {
  return parts.filter((part): part is string => Boolean(part?.trim())).join("").length;
}

export function toSimplifiedFutureRendering(raw: RawFutureAuditItem): SimplifiedFutureRendering {
  return {
    title: raw.title,
    whyItMightHappen: raw.whyItMightHappen ?? "",
    futureImpact: raw.futureImpact ?? raw.title,
  };
}

export function toCurrentFutureRendering(future: ScannableFuture): CurrentFutureRendering {
  return {
    title: future.title,
    whyItMightHappen: future.whyItMightHappen,
    signals: [...future.signals],
    ...(future.sourceTrace ? { sourceTrace: future.sourceTrace } : {}),
    futureImpact: future.futureImpact,
    expansion: future.expansion,
  };
}

export function countSimplifiedFutureCharacters(raw: SimplifiedFutureRendering): number {
  return countCharacters([raw.title, raw.whyItMightHappen, raw.futureImpact]);
}

export function countCurrentFutureCharacters(current: CurrentFutureRendering): {
  displayedCharacters: number;
  signalCharacters: number;
  traceCharacters: number;
} {
  const signalCharacters = countCharacters(current.signals);
  const traceCharacters = countCharacters([current.sourceTrace, current.expansion ?? undefined]);
  const displayedCharacters =
    countCharacters([current.title, current.whyItMightHappen, current.futureImpact]) +
    signalCharacters +
    traceCharacters;

  return {
    displayedCharacters,
    signalCharacters,
    traceCharacters,
  };
}

function findRawFutureMatch(
  future: ScannableFuture,
  rawItems: RawFutureAuditItem[],
  usedRawIndexes: Set<number>,
): RawFutureAuditItem | null {
  const matchKeys = [future.originalTitle, future.title]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeMatchKey);

  for (let index = 0; index < rawItems.length; index += 1) {
    if (usedRawIndexes.has(index)) {
      continue;
    }

    const rawKey = normalizeMatchKey(rawItems[index]!.title);
    if (matchKeys.includes(rawKey)) {
      usedRawIndexes.add(index);
      return rawItems[index]!;
    }
  }

  for (let index = 0; index < rawItems.length; index += 1) {
    if (usedRawIndexes.has(index)) {
      continue;
    }

    const rawKey = normalizeMatchKey(rawItems[index]!.title);
    if (matchKeys.some((key) => key.includes(rawKey) || rawKey.includes(key))) {
      usedRawIndexes.add(index);
      return rawItems[index]!;
    }
  }

  return null;
}

function buildSectionItems(
  section: ForecastSimplificationSection,
  futures: ScannableFuture[],
  rawItems: RawFutureAuditItem[],
): ForecastSimplificationItem[] {
  const usedRawIndexes = new Set<number>();

  return futures.map((future, index) => {
    const current = toCurrentFutureRendering(future);
    const counts = countCurrentFutureCharacters(current);
    const rawMatch = findRawFutureMatch(future, rawItems, usedRawIndexes);
    const raw = rawMatch ? toSimplifiedFutureRendering(rawMatch) : null;
    const rawCharacters = raw ? countSimplifiedFutureCharacters(raw) : 0;
    const characterDelta = counts.displayedCharacters - rawCharacters;
    const displayExpansionRatio =
      rawCharacters > 0 ? Math.round((counts.displayedCharacters / rawCharacters) * 100) : null;

    return {
      section,
      index,
      displayedTitle: future.title,
      raw,
      current,
      rawCharacters,
      displayedCharacters: counts.displayedCharacters,
      signalCharacters: counts.signalCharacters,
      traceCharacters: counts.traceCharacters,
      characterDelta,
      displayExpansionRatio,
      hasRawClaude: raw !== null,
    };
  });
}

export function buildForecastSimplificationAudit(input: {
  rawForecast: RawForecastAudit;
  sections: {
    activeFutures: ScannableFuture[];
    hiddenFutures: ScannableFuture[];
    blindSpotFutures: ScannableFuture[];
  };
}): ForecastSimplificationAudit {
  return {
    active: buildSectionItems("active", input.sections.activeFutures, input.rawForecast.active),
    hidden: buildSectionItems("hidden", input.sections.hiddenFutures, input.rawForecast.hidden),
    blind_spots: buildSectionItems(
      "blind_spots",
      input.sections.blindSpotFutures,
      input.rawForecast.blind_spots,
    ),
  };
}

export function computeForecastSimplificationMetrics(
  audit: ForecastSimplificationAudit,
): ForecastSimplificationMetrics {
  const items = [...audit.active, ...audit.hidden, ...audit.blind_spots];
  const matched = items.filter((item) => item.hasRawClaude);

  const totals = items.reduce(
    (accumulator, item) => {
      accumulator.rawClaudeCharacters += item.rawCharacters;
      accumulator.displayedCharacters += item.displayedCharacters;
      accumulator.signalCharacters += item.signalCharacters;
      accumulator.traceCharacters += item.traceCharacters;
      return accumulator;
    },
    {
      rawClaudeCharacters: 0,
      displayedCharacters: 0,
      signalCharacters: 0,
      traceCharacters: 0,
    },
  );

  return {
    ...totals,
    displayExpansionRatio:
      totals.rawClaudeCharacters === 0
        ? 0
        : Math.round((totals.displayedCharacters / totals.rawClaudeCharacters) * 100),
    matchedFutures: matched.length,
    totalDisplayedFutures: items.length,
  };
}

export function buildForecastSimplificationExperiment(input: {
  rawForecast: RawForecastAudit;
  sections: {
    activeFutures: ScannableFuture[];
    hiddenFutures: ScannableFuture[];
    blindSpotFutures: ScannableFuture[];
  };
}): {
  audit: ForecastSimplificationAudit;
  metrics: ForecastSimplificationMetrics;
} {
  const audit = buildForecastSimplificationAudit(input);
  return {
    audit,
    metrics: computeForecastSimplificationMetrics(audit),
  };
}
