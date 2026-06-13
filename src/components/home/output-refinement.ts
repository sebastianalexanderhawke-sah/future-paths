import type { MockCrossroadResult, MockPathDraft } from "@/lib/mock-crossroad-generator";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import type { Path } from "@/types/database";

import {
  buildRealityForecastSections,
  withRealityForecastFallbacks,
} from "@/components/home/forecast-reality";
import {
  compressCurrentUnderstanding,
  formatPathBenefits,
  formatPathConsequences,
  formatPathFutureYou,
  formatPathSummary,
  formatPathBenefitsWithTrace,
  formatPathConsequencesWithTrace,
  formatPathFutureYouWithTrace,
  formatPathSummaryWithTrace,
} from "@/components/home/path-quality";
import { formatPathTitle, toPathTitleInput } from "@/components/home/path-titles";
import type { ForecastFutureSource } from "@/lib/forecast-source-attribution";
import type {
  PathTextFieldTrace,
  PathTextTransformationPathAudit,
} from "@/lib/path-text-transformation-trace";
import type { FutureShiftAuditItem } from "@/lib/future-shift-preservation";

export type ScannablePath = {
  title: string;
  explanation: string;
  benefits: string[];
  consequences: string[];
  futureYou: string;
  expansion: {
    description: string;
    futureShift: string;
  } | null;
};

export type ScannableFuture = {
  title: string;
  whyItMightHappen: string;
  signals: string[];
  futureImpact: string;
  sourceTrace?: string;
  source?: ForecastFutureSource;
  sourceStage?: string;
  originalTitle?: string | null;
  explanationPreservation?: import("@/lib/forecast-explanation-preservation").ForecastExplanationPreservationTrace;
  expansion: string | null;
};

type PathLike = Pick<
  Path,
  "description" | "benefits" | "consequences" | "future_shift" | "themes"
>;

const MIN_BULLETS = 3;
const MAX_BULLETS = 5;
const MAX_TITLE_LENGTH = 52;
const MAX_SUMMARY_LENGTH = 160;

export function toFirstSentence(text: string, maxLength = MAX_SUMMARY_LENGTH): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^[^.!?]+[.!?]/);
  const sentence = (match ? match[0] : trimmed).trim();

  if (sentence.length <= maxLength) {
    return sentence;
  }

  return truncateAtWordBoundary(sentence, maxLength);
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const shortened = trimmed.slice(0, maxLength).trimEnd();
  const lastSpace = shortened.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.6) {
    return `${shortened.slice(0, lastSpace).trimEnd()}…`;
  }

  return `${shortened.trimEnd()}…`;
}

export function toShortPhrase(text: string, maxLength = MAX_TITLE_LENGTH): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const quoted = trimmed.match(/"([^"]+)"/);
  if (quoted?.[1] && quoted[1].length <= maxLength) {
    return quoted[1];
  }

  const firstSentence = toFirstSentence(trimmed, maxLength);
  const withoutTerminal = firstSentence.replace(/[.!?]+$/, "").trim();

  if (withoutTerminal.length <= maxLength) {
    return withoutTerminal;
  }

  return truncateAtWordBoundary(withoutTerminal, maxLength);
}

export function normalizeBullet(text: string, maxLength = 56): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  let bullet = toFirstSentence(trimmed, maxLength).replace(/[.!?]+$/, "").trim();
  bullet = bullet.replace(/^you may (become|find|discover|feel|notice|build|gain)\s+/i, "");
  bullet = bullet.replace(/^a (possible )?/i, "");
  bullet = bullet.replace(/^the /i, "The ");

  if (!bullet) {
    return truncateAtWordBoundary(trimmed, maxLength);
  }

  return bullet.charAt(0).toUpperCase() + bullet.slice(1);
}

function uniqueBullets(items: string[], maxItems: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const bullet = normalizeBullet(item);
    const key = bullet.toLowerCase();
    if (!bullet || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(bullet);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

export function limitBullets(items: string[], min = MIN_BULLETS, max = MAX_BULLETS): string[] {
  const bullets = uniqueBullets(items, max);

  if (bullets.length >= min) {
    return bullets;
  }

  return bullets;
}

function hasExpansionText(
  path: PathLike,
  explanation: string,
  futureYou: string,
): boolean {
  return (
    path.description.trim() !== explanation ||
    path.future_shift.trim() !== futureYou ||
    path.description.trim().length > explanation.length + 20
  );
}

export function formatScannablePath(
  path: PathLike,
  index = 0,
  titleOverride?: string,
): ScannablePath {
  return formatScannablePathWithTrace(path, index, titleOverride).path;
}

export function formatScannablePathWithTrace(
  path: PathLike,
  index = 0,
  titleOverride?: string,
): {
  path: ScannablePath;
  textTraces: PathTextFieldTrace[];
  futureShiftAudit: FutureShiftAuditItem;
} {
  const { description } = toPathTitleInput(path);
  const title = titleOverride ?? formatPathTitle(description, path.themes ?? [], index);
  const explanationResult = formatPathSummaryWithTrace(description, path.benefits, title);
  const benefitsResult = formatPathBenefitsWithTrace(path.benefits, title);
  const consequencesResult = formatPathConsequencesWithTrace(path.consequences, title);
  const futureYouResult = formatPathFutureYouWithTrace(
    title,
    path.future_shift,
    path.themes ?? [],
    index,
  );
  const explanation = explanationResult.summary;
  const benefits = benefitsResult.bullets;
  const consequences = consequencesResult.bullets;
  const futureYou = futureYouResult.futureYou;

  const textTraces: PathTextFieldTrace[] = [
    {
      field: "explanation",
      label: "Explanation",
      trace: explanationResult.trace,
    },
    ...benefitsResult.traces,
    ...consequencesResult.traces,
    {
      field: "futureYou",
      label: "Future You",
      trace: futureYouResult.trace,
    },
  ];

  return {
    path: {
      title,
      explanation,
      benefits,
      consequences,
      futureYou,
      expansion: hasExpansionText({ ...path, description }, explanation, futureYou)
        ? {
            description: description.trim(),
            futureShift: path.future_shift.trim(),
          }
        : null,
    },
    textTraces,
    futureShiftAudit: futureYouResult.futureShiftAudit,
  };
}

export function buildPathTextTransformationPathAudit(
  pathIndex: number,
  pathTitle: string,
  textTraces: PathTextFieldTrace[],
): PathTextTransformationPathAudit {
  return {
    pathIndex,
    pathTitle,
    fields: textTraces,
  };
}

export { compressCurrentUnderstanding };

export function buildScannableForecastSections(
  crossroad: MockCrossroadResult,
  futureSelves: MockFutureSelfDraft[],
  situationTitle = "",
  selectedPath?: MockPathDraft | null,
  selectedPathTitle?: string,
  contextSummary?: string | null,
): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  return buildRealityForecastSections(
    crossroad.paths,
    futureSelves,
    situationTitle,
    selectedPath,
    selectedPathTitle,
    contextSummary,
  );
}

export function withScannableForecastFallbacks(
  sections: {
    activeFutures: ScannableFuture[];
    hiddenFutures: ScannableFuture[];
    blindSpotFutures: ScannableFuture[];
  },
  situationTitle: string,
): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  return withRealityForecastFallbacks(sections, situationTitle);
}
