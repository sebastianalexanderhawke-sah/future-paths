import type { GroundingBundle } from "@/components/home/forecast-grounding";
import { buildGroundedWhy } from "@/components/home/forecast-grounding";
import { isCompleteSentence } from "@/components/home/path-quality";
import type { ScannableFuture } from "@/components/home/output-refinement";
import { toFirstSentence } from "@/components/home/output-refinement";

export type ForecastExplanationPreservationStatus = "preserved" | "reconstructed" | "fallback";

export type ForecastExplanationValidationResult = {
  valid: boolean;
  reason?:
    | "empty"
    | "fragment"
    | "too-long"
    | "incomplete"
    | "reflection-language"
    | "template"
    | "generic";
};

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

export type ForecastExplanationResolution = {
  rawExplanation: string | null;
  displayedExplanation: string;
  status: ForecastExplanationPreservationStatus;
  validation: ForecastExplanationValidationResult;
  trace: ForecastExplanationPreservationTrace;
};

const MAX_FORECAST_EXPLANATION_LENGTH = 400;

const REFLECTIVE_EXPLANATION_START =
  /^(gain|observe|reflect|learn|understand|explore|process|consider|think about|become more self-aware|reflect more deeply)\b/i;

const GENERATED_EXPLANATION_TEMPLATES = [
  /^because you described/i,
  /^based on "/i,
  /^the situation suggests/i,
  /^this outcome follows naturally/i,
];

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function isReflectiveExplanationViolation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  if (/^gain clarity\.?$/i.test(trimmed)) {
    return true;
  }

  if (/^become more self-aware\.?$/i.test(trimmed)) {
    return true;
  }

  if (/^reflect more deeply\.?$/i.test(trimmed)) {
    return true;
  }

  if (REFLECTIVE_EXPLANATION_START.test(trimmed) && trimmed.split(/\s+/).length < 12) {
    return true;
  }

  return false;
}

function isGeneratedExplanationTemplate(text: string): boolean {
  return GENERATED_EXPLANATION_TEMPLATES.some((pattern) => pattern.test(text.trim()));
}

function isSituationSpecificExplanation(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.split(/\s+/).length >= 10) {
    return true;
  }

  return /\b(she|he|they|you|work|colleague|office|conversation|initiat|interest|personality|refusal|directness|ambiguity|company|signal|friendly|extremely|friend|date|move|job|offer|city|dallas|crush|relationship|workplace|message|text|invite|coffee|lunch)\b/i.test(
    trimmed,
  );
}

export function validateForecastExplanation(text: string): ForecastExplanationValidationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, reason: "empty" };
  }

  if (trimmed.includes("…")) {
    return { valid: false, reason: "fragment" };
  }

  if (trimmed.length > MAX_FORECAST_EXPLANATION_LENGTH) {
    return { valid: false, reason: "too-long" };
  }

  if (isGeneratedExplanationTemplate(trimmed)) {
    return { valid: false, reason: "template" };
  }

  if (isReflectiveExplanationViolation(trimmed)) {
    return { valid: false, reason: "reflection-language" };
  }

  if (!isCompleteSentence(ensureTerminalPunctuation(trimmed))) {
    return { valid: false, reason: "incomplete" };
  }

  if (!isSituationSpecificExplanation(trimmed)) {
    return { valid: false, reason: "generic" };
  }

  return { valid: true };
}

export function shouldPreserveForecastExplanation(text: string): boolean {
  return validateForecastExplanation(text).valid;
}

export function resolveForecastExplanation(
  rawWhy: string | null | undefined,
  title: string,
  bundle: GroundingBundle,
): ForecastExplanationResolution {
  const raw = rawWhy?.trim() ?? "";
  const validation = validateForecastExplanation(raw);

  if (validation.valid) {
    const displayedExplanation = ensureTerminalPunctuation(raw);
    return {
      rawExplanation: raw,
      displayedExplanation,
      status: "preserved",
      validation,
      trace: {
        rawExplanation: raw,
        status: "preserved",
      },
    };
  }

  const reconstructed = buildGroundedWhy(
    title,
    bundle,
    raw ? toFirstSentence(raw, 160) : null,
  );

  const status: ForecastExplanationPreservationStatus = raw ? "reconstructed" : "fallback";

  return {
    rawExplanation: raw || null,
    displayedExplanation: reconstructed,
    status,
    validation,
    trace: {
      rawExplanation: raw || null,
      status,
    },
  };
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
