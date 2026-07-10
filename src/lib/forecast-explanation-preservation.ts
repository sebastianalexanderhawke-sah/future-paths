import type { ScannableFuture } from "@/components/home/output-refinement";

// Forecasts v2.2: this module no longer rewrites anything. The v1
// resolveForecastExplanation/validateForecastExplanation machinery — which
// replaced any "why" that was >400 chars, "generic", or an incomplete
// sentence with an application-written "Because you described…" template —
// was removed: the model is the sole author of forecast prose, and its
// descriptions are carried verbatim (see mapGeneratedFutureVerbatim in
// forecast-reality.ts). What remains here is the audit vocabulary for
// preservation status, still used to report how stored forecasts (including
// pre-v2.2 rows with reconstructed/fallback text) were produced.

export type ForecastExplanationPreservationStatus = "preserved" | "reconstructed" | "fallback";

export type ForecastExplanationPreservationItem = {
  section: "active" | "hidden" | "blind_spots";
  index: number;
  title: string;
  rawExplanation: string | null;
  displayedExplanation: string;
  status: ForecastExplanationPreservationStatus;
};

export type ForecastExplanationPreservationAudit = {
  active: ForecastExplanationPreservationItem[];
  hidden: ForecastExplanationPreservationItem[];
  blind_spots: ForecastExplanationPreservationItem[];
};

export type ForecastExplanationPreservationMetrics = {
  preservedExplanations: number;
  reconstructedExplanations: number;
  fallbackExplanations: number;
  totalExplanations: number;
  percentages: {
    preservedExplanations: number;
    reconstructedExplanations: number;
    fallbackExplanations: number;
  };
};

export type ForecastExplanationPreservationTrace = {
  rawExplanation: string | null;
  status: ForecastExplanationPreservationStatus;
};

// Recognizes application-written template text ("Because you described…") in
// stored forecasts, so the audit can classify pre-v2.2 rows whose displayed
// explanation was reconstructed rather than model-written.
const GENERATED_EXPLANATION_TEMPLATES = [
  /^because you described/i,
  /^based on "/i,
  /^the situation suggests/i,
  /^this outcome follows naturally/i,
];

function isGeneratedExplanationTemplate(text: string): boolean {
  return GENERATED_EXPLANATION_TEMPLATES.some((pattern) => pattern.test(text.trim()));
}

function itemFromFuture(
  future: ScannableFuture,
  section: "active" | "hidden" | "blind_spots",
  index: number,
): ForecastExplanationPreservationItem {
  if (future.explanationPreservation) {
    return {
      section,
      index,
      title: future.title,
      rawExplanation: future.explanationPreservation.rawExplanation,
      displayedExplanation: future.whyItMightHappen,
      status: future.explanationPreservation.status,
    };
  }

  return {
    section,
    index,
    title: future.title,
    rawExplanation: null,
    displayedExplanation: future.whyItMightHappen,
    status: isGeneratedExplanationTemplate(future.whyItMightHappen) ? "fallback" : "reconstructed",
  };
}

export function buildForecastExplanationPreservationAudit(sections: {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
}): ForecastExplanationPreservationAudit {
  return {
    active: sections.activeFutures.map((future, index) => itemFromFuture(future, "active", index)),
    hidden: sections.hiddenFutures.map((future, index) => itemFromFuture(future, "hidden", index)),
    blind_spots: sections.blindSpotFutures.map((future, index) =>
      itemFromFuture(future, "blind_spots", index),
    ),
  };
}

export function computeForecastExplanationPreservationMetrics(
  audit: ForecastExplanationPreservationAudit,
): ForecastExplanationPreservationMetrics {
  const items = [...audit.active, ...audit.hidden, ...audit.blind_spots];
  const metrics = {
    preservedExplanations: 0,
    reconstructedExplanations: 0,
    fallbackExplanations: 0,
    totalExplanations: items.length,
  };

  for (const item of items) {
    if (item.status === "preserved") {
      metrics.preservedExplanations += 1;
    } else if (item.status === "reconstructed") {
      metrics.reconstructedExplanations += 1;
    } else {
      metrics.fallbackExplanations += 1;
    }
  }

  const round = (count: number) =>
    metrics.totalExplanations === 0
      ? 0
      : Math.round((count / metrics.totalExplanations) * 100);

  return {
    ...metrics,
    percentages: {
      preservedExplanations: round(metrics.preservedExplanations),
      reconstructedExplanations: round(metrics.reconstructedExplanations),
      fallbackExplanations: round(metrics.fallbackExplanations),
    },
  };
}
