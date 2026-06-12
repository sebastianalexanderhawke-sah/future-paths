import type { MockPathDraft } from "@/lib/mock-crossroad-generator";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import type { ForecastFutureDraft, ForecastOutput } from "@/lib/ai/schemas/forecast";

import type { ScannableFuture } from "@/components/home/output-refinement";
import {
  buildGroundedWhy,
  buildGroundingBundle,
  buildSourceTrace,
  isGroundedFutureText,
  mentionsInventedTopic,
  pickGroundedSocialCircleTitle,
  scoreSourceGrounding,
  type GroundingBundle,
} from "@/components/home/forecast-grounding";
import {
  generateRecoveredFutures,
  recoverForecastTitle,
  recoverFutureCandidate,
  recoverFutureImpact,
  shouldRunRecoveryGeneration,
  type ForecastRecoveryInput,
} from "@/components/home/forecast-recovery";
import { detectSituationDomain } from "@/components/home/path-titles";

const MIN_SIGNALS = 3;
const MAX_SIGNALS = 5;
const MIN_ACTIVE_FUTURES = 4;
const MAX_ACTIVE_FUTURES = 6;
const MIN_HIDDEN_FUTURES = 3;
const MAX_HIDDEN_FUTURES = 5;
const MIN_BLIND_SPOT_FUTURES = 3;
const MAX_BLIND_SPOT_FUTURES = 5;
const MAX_TITLE_LENGTH = 52;
const MAX_SUMMARY_LENGTH = 160;

function toFirstSentence(text: string, maxLength = MAX_SUMMARY_LENGTH): string {
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

function toShortPhrase(text: string, maxLength = MAX_TITLE_LENGTH): string {
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

const REFLECTIVE_FORECAST_PATTERNS: RegExp[] = [
  /\bclarity\b/i,
  /\breflect(ion|ive|ing| further)?\b/i,
  /\bobserve\b/i,
  /\bobservation\b/i,
  /\blearn(ing)? more\b/i,
  /\bunderstand(ing)? (yourself|your feelings|more|better|deepens)\b/i,
  /\bself[- ]awareness\b/i,
  /\bgrowth journey\b/i,
  /\bexplore (possibilities|options|more)\b/i,
  /\binner exploration\b/i,
  /\buncover patterns\b/i,
  /\bdevelop understanding\b/i,
  /\bbuild understanding\b/i,
  /\bgain (more )?(clarity|insight|perspective)\b/i,
  /\bthink(ing)? (about|through)\b/i,
  /\bprocess(ing)? (your|the|feelings)\b/i,
  /\bprocess feelings\b/i,
  /\bbecome someone who\b/i,
  /\bbecoming someone who\b/i,
  /\binternal (shift|work|change|process)\b/i,
  /\bemotional (clarity|processing)\b/i,
  /\bnotice patterns\b/i,
  /\bspace to notice\b/i,
  /\bdeliberate (effort|reflection)\b/i,
  /\bwho you (are|want to be)\b/i,
  /\bmay gradually reveal\b/i,
  /\bdeeper understanding\b/i,
  /\bbetter understanding\b/i,
  /\binsight\b/i,
  /\bpatterns\b/i,
];

const REFLECTIVE_ACTION_START =
  /^(gain|observe|reflect|learn|understand|explore|process|consider|think about|work on|focus on|notice|gather)\b/i;

const ARCHETYPE_NAME_PATTERN = /^the [a-z\s]+$/i;

const OUTCOME_INDICATOR_PATTERNS: RegExp[] = [
  /\b(relationship|friendship|friend group|dating|crush|partner|significant other)\b/i,
  /\b(someone else|another person|new person)\b/i,
  /\b(stays friendly|slow[- ]build|timing|aligns)\b/i,
  /\b(career|job|promotion|role|offer|opportunity)\b/i,
  /\b(return|move|relocate|stay|leave|remain|homesick|homesickness)\b/i,
  /\b(social circle|community|friendships?|lonely|loneliness|isolated)\b/i,
  /\b(forms|remains|develops|advances|disappears|expands|takes off|passes|fades)\b/i,
  /\b(within a year|longer than expected|after a year|over time)\b/i,
  /\b(marriage|breakup|distance|visit home|new city)\b/i,
  /\b(unexpected|surprising|secondary|background)\b/i,
];

const TITLE_REWRITES: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /career growth|promotion|career takes off/i, title: "You Receive A Promotion Within The First Year" },
  { pattern: /temporary loneliness|homesickness/i, title: "Homesickness Hits After The Initial Excitement Fades" },
  { pattern: /opportunity may pass|opportunity disappears/i, title: "The Opportunity Disappears Before You Decide" },
  { pattern: /stay in .* longer than expected/i, title: "You Stay In Dallas Longer Than Planned" },
  { pattern: /return home|visit home/i, title: "Visiting Home Becomes More Expensive Than Expected" },
  { pattern: /someone else|another person|another coworker/i, title: "A Coworker Becomes Her Focus" },
  { pattern: /friendship remains|stays friendly/i, title: "You Keep Talking Every Week But Nothing Changes" },
  { pattern: /slow[- ]build relationship|relationship forms|relationship begins|she starts texting/i, title: "She Starts Texting You Outside Work" },
  { pattern: /slow[- ]build/i, title: "She Starts Texting You Outside Work" },
  { pattern: /timing never aligns/i, title: "Every Good Moment Gets Interrupted At Work" },
  { pattern: /distance from familiar places/i, title: "Weekend Trips Home Become Your Routine" },
  { pattern: /less immersion|never fully settle/i, title: "You Never Fully Settle Into The New City" },
  { pattern: /keep current stability|stay where you are/i, title: "Your Daily Life Stays Exactly The Same" },
  { pattern: /mutual friend/i, title: "A Mutual Friend Changes Everything" },
  { pattern: /transfer to another team|transfers to another team/i, title: "She Transfers To Another Team" },
  { pattern: /gain clarity/i, title: "She Tells You How She Feels" },
  { pattern: /lease|renew/i, title: "You Renew Your Lease After One Year" },
  {
    pattern: /understand|understanding|insight|reflection|observe|explore possibilities|uncover patterns|inner exploration/i,
    title: "",
  },
];

const ABSTRACT_CATEGORY_PATTERNS: RegExp[] = [
  /\bstrong social circle forms?\b/i,
  /\bcareer takes off\b/i,
  /\bstays friendly\b/i,
  /\bslow[- ]build relationship\b/i,
  /\blife moves forward\b/i,
  /\bsecondary outcome takes over\b/i,
  /\btimeline stretches longer\b/i,
  /\brelationship forms?\b/i,
  /\bmeet significant other\b/i,
  /\bunexpected opportunity\b/i,
  /\bsomeone else enters the picture\b/i,
];

const SCENE_TITLE_BY_KEY: Record<string, string> = {
  "strong social circle forms": "Most Of Your New Friends Come From Work",
  "career takes off": "You Receive A Promotion Within The First Year",
  "stays friendly": "You Keep Talking Every Week But Nothing Changes",
  "slow build relationship": "She Starts Texting You Outside Work",
  "relationship forms": "She Agrees To Meet Up Outside Work",
  "someone else enters the picture": "A Coworker Becomes Her Focus",
  "meet significant other": "You Meet Someone At Work",
  "return home within a year": "Visiting Home Becomes More Expensive Than Expected",
  "homesickness": "Homesickness Hits After The Initial Excitement Fades",
  "life moves forward": "Your Routine Settles Into A New Normal",
  "timing never aligns": "Every Good Moment Gets Interrupted At Work",
  "opportunity disappears": "The Opportunity Disappears Before You Decide",
};

const FUTURE_CONTENT_REWRITES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /gain clarity/i, replacement: "The answer becomes clear within weeks." },
  { pattern: /uncover patterns/i, replacement: "A hidden consequence becomes visible." },
  { pattern: /develop understanding/i, replacement: "The situation resolves in a concrete way." },
  { pattern: /inner exploration/i, replacement: "A new routine takes over daily life." },
  { pattern: /reflect further/i, replacement: "The situation stays unresolved longer." },
  { pattern: /observe more/i, replacement: "More time passes without a change." },
  { pattern: /better understanding/i, replacement: "The outcome becomes obvious." },
  { pattern: /explore possibilities/i, replacement: "A new opportunity appears." },
  { pattern: /notice patterns/i, replacement: "A repeated dynamic becomes obvious." },
  { pattern: /process feelings/i, replacement: "The emotional stakes become public." },
  { pattern: /she assumes you are not interested/i, replacement: "She assumes you are not interested." },
  { pattern: /friendship becomes the primary relationship/i, replacement: "The friendship becomes the primary relationship." },
];

function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeComparable(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, "");
}

export function isReflectiveForecast(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  if (REFLECTIVE_ACTION_START.test(trimmed)) {
    return true;
  }

  return REFLECTIVE_FORECAST_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isPhotographableFuture(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isReflectiveForecast(trimmed)) {
    return false;
  }

  if (scoreForecastSpecificity(trimmed) >= 3) {
    return true;
  }

  if (scoreOutcomeReality(trimmed) > 0 && !isAbstractCategoryFuture(trimmed)) {
    return true;
  }

  return /\b(begins|forms|fades|appears|ends|breaks|starts|leaves|returns|moves|dates|promoted|fired|hires|relocates|marries|awkward|interest|friendship|relationship|job|offer|circle|opportunity|texts|transfers|promotion)\b/i.test(
    trimmed,
  );
}

export function isAbstractCategoryFuture(text: string): boolean {
  const normalized = normalizeComparable(text);
  if (SCENE_TITLE_BY_KEY[normalized]) {
    return false;
  }

  return ABSTRACT_CATEGORY_PATTERNS.some((pattern) => pattern.test(text));
}

export function scoreForecastSpecificity(text: string, bundle?: GroundingBundle): number {
  const trimmed = text.trim();
  if (!trimmed || isReflectiveForecast(trimmed)) {
    return -10;
  }

  let score = scoreOutcomeReality(trimmed);

  if (/\b(she|he|they|coworker|friend|partner|boss|team)\b/i.test(trimmed)) {
    score += 3;
  }

  if (/\b(work|office|dallas|home|city|apartment|job|offer|lease)\b/i.test(trimmed)) {
    score += 2;
  }

  if (/\b(text|texting|promotion|transfer|invite|lunch|date|move|week|month|year|fly|meet up|renew|visit)\b/i.test(trimmed)) {
    score += 2;
  }

  if (/\b(within|after|before|every week|three months|first year|one year|initial excitement)\b/i.test(trimmed)) {
    score += 2;
  }

  if (isAbstractCategoryFuture(trimmed)) {
    score -= 6;
  }

  if (
    /\b(relationship|friendship|opportunity|growth|stability|circle)\b/i.test(trimmed) &&
    !/\b(she|he|you|work|promotion|text|coworker|dallas|home|job|lease|visit)\b/i.test(trimmed)
  ) {
    score -= 3;
  }

  if (bundle) {
    score += scoreSourceGrounding(trimmed, bundle);
  }

  return score;
}

function resolveForecastTitle(titleSource: string, bundle: GroundingBundle): string {
  const trimmed = titleSource.trim();
  if (!trimmed) {
    return "";
  }

  if (/build a new social circle|new social circle|social circle|friend group|local connections|most of your new friends/i.test(trimmed)) {
    const title = pickGroundedSocialCircleTitle(bundle);
    if (isGroundedFutureText(title, bundle)) {
      return title;
    }
  }

  if (/run club|join a run club|running club/i.test(trimmed)) {
    if (/\brun(ning)?|jog(ging)?|run club|marathon\b/i.test(bundle.corpus)) {
      const title = "The Run Club Becomes Your Main Friend Group";
      if (isGroundedFutureText(title, bundle)) {
        return title;
      }
    }

    return pickGroundedSocialCircleTitle(bundle);
  }

  const formatted = upgradeToSceneTitle(formatForecastTitle(trimmed));
  if (formatted && isGroundedFutureText(formatted, bundle)) {
    return formatted;
  }

  const recovered = recoverForecastTitle(trimmed, bundle);
  if (recovered) {
    return recovered;
  }

  return formatted && !mentionsInventedTopic(formatted, bundle) ? formatted : "";
}

function upgradeToSceneTitle(title: string): string {
  const normalized = normalizeComparable(title);
  const sceneTitle = SCENE_TITLE_BY_KEY[normalized];
  if (sceneTitle) {
    return sceneTitle;
  }

  if (isAbstractCategoryFuture(title)) {
    for (const rewrite of TITLE_REWRITES) {
      if (rewrite.pattern.test(title) && rewrite.title) {
        return rewrite.title;
      }
    }
  }

  return title;
}

function rewriteFutureText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  for (const { pattern, replacement } of FUTURE_CONTENT_REWRITES) {
    if (pattern.test(trimmed)) {
      return replacement;
    }
  }

  return trimmed;
}

export function scoreOutcomeReality(text: string): number {
  const trimmed = text.trim();
  if (!trimmed || isReflectiveForecast(trimmed)) {
    return -10;
  }

  let score = 0;

  for (const pattern of OUTCOME_INDICATOR_PATTERNS) {
    if (pattern.test(trimmed)) {
      score += 2;
    }
  }

  if (/\b(may|might|could|will|becomes|remains|forms|develops)\b/i.test(trimmed)) {
    score += 1;
  }

  if (trimmed.length <= 48) {
    score += 1;
  }

  return score;
}

export function formatForecastTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  for (const rewrite of TITLE_REWRITES) {
    if (rewrite.pattern.test(trimmed) && rewrite.title) {
      return upgradeToSceneTitle(rewrite.title);
    }
  }

  let phrase = trimmed
    .replace(/^you may (become|find|stay|build|gain|feel|be|receive|start|keep|fly)\s+/i, "")
    .replace(/^you (receive|start|keep|fly|meet|transfer)\s+/i, "You $1 ")
    .replace(/^you are (becoming|entering|facing)\s+/i, "")
    .replace(/^a (possible )?/i, "")
    .replace(/^the /i, "the ");

  phrase = toFirstSentence(phrase, 52).replace(/[.!?]+$/, "").trim();
  phrase = phrase.replace(/^to /i, "");

  if (ARCHETYPE_NAME_PATTERN.test(phrase)) {
    return "";
  }

  if (phrase.length > 52) {
    phrase = toShortPhrase(phrase, 52);
  }

  const title = toTitleCase(phrase);
  return upgradeToSceneTitle(title);
}

function formatForecastImpact(text: string, bundle?: GroundingBundle): string {
  let sentence = toFirstSentence(text, 140);
  sentence = sentence.replace(/^you may become someone who\s+/i, "");
  sentence = sentence.replace(/^you may become\s+/i, "");
  sentence = sentence.replace(/^you may stay\s+/i, "You stay ");
  sentence = sentence.replace(/^you may feel\s+/i, "You feel ");

  if (isReflectiveForecast(sentence)) {
    const recovered = recoverFutureImpact(text, bundle);
    return recovered ?? "";
  }

  if (bundle) {
    const recovered = recoverFutureImpact(sentence, bundle);
    if (recovered) {
      return recovered;
    }
  }

  return sentence;
}

function pickBestRealityCandidate(candidates: string[], bundle?: GroundingBundle): string | null {
  const ranked = candidates
    .map((candidate) => ({
      candidate: candidate.trim(),
      score: scoreForecastSpecificity(candidate, bundle),
    }))
    .filter((entry) => entry.candidate.length > 0 && entry.score > 0)
    .filter((entry) => !bundle || isGroundedFutureText(entry.candidate, bundle))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.candidate ?? null;
}

function collectPathOutcomeCandidates(path: MockPathDraft): string[] {
  return [
    path.description,
    ...path.benefits,
    ...path.consequences,
    path.future_shift,
  ].filter(Boolean);
}

function collectSignalCandidates(path: MockPathDraft): string[] {
  return [...path.benefits, ...path.consequences, toShortPhrase(path.description)].filter(
    (item) => item.length > 0 && !isReflectiveForecast(item),
  );
}

function buildForecastSignals(path: MockPathDraft): string[] {
  const seen = new Set<string>();
  const signals: string[] = [];

  for (const candidate of collectSignalCandidates(path)) {
    const signal = toShortPhrase(candidate, 44);
    const key = normalizeComparable(signal);
    if (!signal || seen.has(key) || isReflectiveForecast(signal)) {
      continue;
    }

    seen.add(key);
    signals.push(toTitleCase(signal));

    if (signals.length >= MAX_SIGNALS) {
      break;
    }
  }

  return signals;
}

function isSameForecastTitle(left: string, right: string): boolean {
  return normalizeComparable(left) === normalizeComparable(right);
}

function formatForecastWhy(
  title: string,
  path: MockPathDraft,
  bundle: GroundingBundle,
): string {
  const candidates = collectPathOutcomeCandidates(path).filter(
    (candidate) =>
      !isReflectiveForecast(candidate) &&
      !isSameForecastTitle(formatForecastTitle(candidate), title) &&
      isGroundedFutureText(candidate, bundle),
  );

  const best = pickBestRealityCandidate(candidates, bundle);
  return buildGroundedWhy(title, bundle, best ? toFirstSentence(best, 120) : null);
}

function isValidRealityFuture(future: ScannableFuture, bundle?: GroundingBundle): boolean {
  if (!future.title || isReflectiveForecast(future.title)) {
    return false;
  }

  if (bundle) {
    if (!isGroundedFutureText(future.title, bundle)) {
      return false;
    }

    if (!isGroundedFutureText(future.futureImpact, bundle)) {
      return false;
    }
  } else {
    if (!isPhotographableFuture(future.title) || !isPhotographableFuture(future.futureImpact)) {
      return false;
    }
  }

  if (isReflectiveForecast(future.whyItMightHappen) || isReflectiveForecast(future.futureImpact)) {
    return false;
  }

  return future.signals.length >= 1;
}

function sanitizeFuture(future: ScannableFuture, bundle?: GroundingBundle): ScannableFuture {
  const title = bundle
    ? resolveForecastTitle(future.title, bundle) || upgradeToSceneTitle(formatForecastTitle(rewriteFutureText(future.title)))
    : upgradeToSceneTitle(formatForecastTitle(rewriteFutureText(future.title)));

  return {
    ...future,
    title,
    whyItMightHappen: toFirstSentence(rewriteFutureText(future.whyItMightHappen), 160),
    futureImpact: toFirstSentence(rewriteFutureText(future.futureImpact), 140),
    sourceTrace: bundle ? buildSourceTrace(bundle) : future.sourceTrace,
    signals: future.signals
      .map((signal) => toTitleCase(rewriteFutureText(signal)))
      .filter(
        (signal) =>
          signal.length > 0 && (!bundle || !mentionsInventedTopic(signal, bundle)),
      ),
  };
}

function buildRealityFuture(
  titleSource: string,
  path: MockPathDraft,
  bundle: GroundingBundle,
  impactSource: string,
  expansion: string | null,
): ScannableFuture | null {
  let title = resolveForecastTitle(titleSource, bundle);

  if (!title) {
    const recovered = recoverFutureCandidate(titleSource, bundle);
    title = recovered?.title ?? "";
  }

  if (!title || isReflectiveForecast(title)) {
    return null;
  }

  const signals = buildForecastSignals(path).filter(
    (signal) => !mentionsInventedTopic(signal, bundle),
  );
  let futureImpact = formatForecastImpact(impactSource, bundle);

  if (!futureImpact) {
    futureImpact =
      recoverFutureImpact(impactSource, bundle) ??
      recoverFutureCandidate(titleSource, bundle)?.impact ??
      `${title} becomes a visible turning point within months.`;
  }

  if (mentionsInventedTopic(futureImpact, bundle)) {
    futureImpact = `${title} changes what happens next.`;
  }

  const paddedSignals =
    signals.length >= MIN_SIGNALS
      ? signals.slice(0, MAX_SIGNALS)
      : [
          ...signals,
          ...path.consequences
            .map((consequence) => toTitleCase(toShortPhrase(consequence, 44)))
            .filter(
              (signal) =>
                signal.length > 0 &&
                !isReflectiveForecast(signal) &&
                !mentionsInventedTopic(signal, bundle),
            ),
        ].slice(0, MAX_SIGNALS);

  const future: ScannableFuture = sanitizeFuture(
    {
      title,
      whyItMightHappen: formatForecastWhy(title, path, bundle),
      signals: paddedSignals.length > 0 ? paddedSignals : ["Recent decision", "Current momentum", "Open timeline"],
      futureImpact,
      expansion,
    },
    bundle,
  );

  return isValidRealityFuture(future, bundle) ? future : null;
}

function buildActiveRealityFuture(
  path: MockPathDraft,
  bundle: GroundingBundle,
): ScannableFuture | null {
  const titleSource =
    pickBestRealityCandidate(path.benefits, bundle) ??
    pickBestRealityCandidate(path.consequences, bundle) ??
    pickBestRealityCandidate([path.future_shift], bundle) ??
    path.benefits[0] ??
    path.description;

  return buildRealityFuture(
    titleSource,
    path,
    bundle,
    path.future_shift || path.benefits[0] || path.consequences[0] || path.description,
    `${path.description}\n\n${path.future_shift}`,
  );
}

function buildHiddenRealityFuture(
  path: MockPathDraft,
  bundle: GroundingBundle,
): ScannableFuture | null {
  const hiddenCandidates = path.consequences.filter(
    (consequence) => !isReflectiveForecast(consequence) && isGroundedFutureText(consequence, bundle),
  );
  const titleSource =
    pickBestRealityCandidate(hiddenCandidates, bundle) ??
    hiddenCandidates[0] ??
    path.future_shift;

  return buildRealityFuture(
    titleSource,
    path,
    bundle,
    hiddenCandidates[hiddenCandidates.length - 1] ?? path.future_shift,
    hiddenCandidates.join("\n"),
  );
}

function buildBlindSpotRealityFuture(
  path: MockPathDraft,
  futureSelf: MockFutureSelfDraft | null,
  bundle: GroundingBundle,
): ScannableFuture | null {
  const detailCandidates = [
    path.future_shift,
    ...path.consequences,
    ...(futureSelf && !ARCHETYPE_NAME_PATTERN.test(futureSelf.name) ? [futureSelf.name] : []),
    ...(futureSelf ? [futureSelf.description] : []),
  ].filter(
    (candidate) => candidate.trim().length > 0 && isGroundedFutureText(candidate, bundle),
  );

  const titleSource =
    pickBestRealityCandidate(detailCandidates, bundle) ?? path.future_shift ?? path.consequences[0];

  return buildRealityFuture(
    titleSource,
    path,
    bundle,
    futureSelf?.description ?? path.future_shift,
    futureSelf?.description ?? path.future_shift,
  );
}

function uniqueRealityFutures(futures: ScannableFuture[], maxItems: number): ScannableFuture[] {
  const seen = new Set<string>();
  const result: ScannableFuture[] = [];

  for (const future of futures) {
    const key = normalizeComparable(future.title);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(future);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

function buildRelationshipFallbacks(bundle: GroundingBundle): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  return {
    activeFutures: [
      {
        title: "You Keep Talking Every Week But Nothing Changes",
        whyItMightHappen: buildGroundedWhy(
          "You Keep Talking Every Week But Nothing Changes",
          bundle,
          "Daily contact continues without a clear shift in tone.",
        ),
        signals: ["Same workplace", "Limited alone time", "No direct move", "Existing rapport"],
        futureImpact: "Lunch stays friendly and nothing crosses into dating.",
        expansion: null,
      },
      {
        title: "She Starts Texting You Outside Work",
        whyItMightHappen: buildGroundedWhy(
          "She Starts Texting You Outside Work",
          bundle,
          "Repeated interactions create space for something closer to form.",
        ),
        signals: ["Regular contact", "Shared projects", "Outside-work overlap", "Mutual interest"],
        futureImpact: "Plans start happening on weekends, not just at the office.",
        expansion: null,
      },
      {
        title: "A Coworker Becomes Her Focus",
        whyItMightHappen: buildGroundedWhy(
          "A Coworker Becomes Her Focus",
          bundle,
          "Workplace proximity puts others in the same position.",
        ),
        signals: ["New coworker", "Shift in team", "Outside dating life", "Changed schedule"],
        futureImpact: "She starts spending breaks with someone else.",
        expansion: null,
      },
      {
        title: "Every Good Moment Gets Interrupted At Work",
        whyItMightHappen: buildGroundedWhy(
          "Every Good Moment Gets Interrupted At Work",
          bundle,
          "Work boundaries can keep things from progressing.",
        ),
        signals: ["Busy seasons", "Policy constraints", "Different priorities", "Limited overlap"],
        futureImpact: "Every almost-moment gets cut short by a meeting or coworker.",
        expansion: null,
      },
    ],
    hiddenFutures: [
      {
        title: "She Assumes You're Not Interested",
        whyItMightHappen: buildGroundedWhy(
          "She Assumes You're Not Interested",
          bundle,
          "Platonic behavior can read as disinterest over time.",
        ),
        signals: ["Daily work contact", "No romantic signals", "Mixed messages", "Long timeline"],
        futureImpact: "She stops looking for signs because the friendship feels settled.",
        expansion: null,
      },
      {
        title: "A One-On-One Opportunity Appears Naturally",
        whyItMightHappen: buildGroundedWhy(
          "A One-On-One Opportunity Appears Naturally",
          bundle,
          "Shared projects or social plans can create private time.",
        ),
        signals: ["After-work invite", "Shared project", "Team event", "Mutual friend"],
        futureImpact: "You finally talk outside the usual work routine.",
        expansion: null,
      },
      {
        title: "You Never Learn How She Feels",
        whyItMightHappen: buildGroundedWhy(
          "You Never Learn How She Feels",
          bundle,
          "Without a direct move, ambiguity can last indefinitely.",
        ),
        signals: ["Limited alone time", "Polite friendship", "No clear signals", "Long timeline"],
        futureImpact: "The answer stays unknown even after months of contact.",
        expansion: null,
      },
    ],
    blindSpotFutures: [
      {
        title: "She Says Yes On The First Ask",
        whyItMightHappen: buildGroundedWhy(
          "She Says Yes On The First Ask",
          bundle,
          "A clear moment can cut through months of ambiguity.",
        ),
        signals: ["Outside-work invite", "Direct question", "Private setting", "Mutual rapport"],
        futureImpact: "Plans move from lunch at work to a date that week.",
        expansion: null,
      },
      {
        title: "She Says No But Stays Friendly At Work",
        whyItMightHappen: buildGroundedWhy(
          "She Says No But Stays Friendly At Work",
          bundle,
          "A direct ask can end uncertainty without ending contact.",
        ),
        signals: ["Clear question", "Existing rapport", "Professional setting", "Honest answer"],
        futureImpact: "The crush fades but daily work stays workable.",
        expansion: null,
      },
      {
        title: "A Coworker Overhears And It Gets Awkward",
        whyItMightHappen: buildGroundedWhy(
          "A Coworker Overhears And It Gets Awkward",
          bundle,
          "Workplace moments rarely stay fully private.",
        ),
        signals: ["Open office", "Shared team", "Break room", "Office gossip"],
        futureImpact: "Small talk feels strained for a few weeks.",
        expansion: null,
      },
    ],
  };
}

function buildRelocationFallbacks(bundle: GroundingBundle): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  return {
    activeFutures: [
      {
        title: pickGroundedSocialCircleTitle(bundle),
        whyItMightHappen: buildGroundedWhy(
          pickGroundedSocialCircleTitle(bundle),
          bundle,
          "Moving alone usually pushes new friendships through daily routines like work.",
        ),
        signals: ["New city", "New job", "Daily coworkers", "Limited existing ties"],
        futureImpact: "Coworker lunches and team events become your main social life.",
        expansion: null,
      },
      {
        title: "You Receive A Promotion Within The First Year",
        whyItMightHappen: buildGroundedWhy(
          "You Receive A Promotion Within The First Year",
          bundle,
          "Taking the role puts you closer to responsibility and visibility.",
        ),
        signals: ["New role", "More responsibility", "Fresh start", "Performance window"],
        futureImpact: "Your title and pay change before the first anniversary.",
        expansion: null,
      },
      {
        title: "Homesickness Hits After The Initial Excitement Fades",
        whyItMightHappen: buildGroundedWhy(
          "Homesickness Hits After The Initial Excitement Fades",
          bundle,
          "Distance from familiar people often feels louder once the move stops feeling new.",
        ),
        signals: ["Move alone", "Far from home", "Holiday visits", "Old friendships"],
        futureImpact: "You start booking trips home more often than planned.",
        expansion: null,
      },
      {
        title: "You Stay In Dallas Longer Than Planned",
        whyItMightHappen: buildGroundedWhy(
          "You Stay In Dallas Longer Than Planned",
          bundle,
          "A workable job and routine can turn a tentative move into a longer stay.",
        ),
        signals: ["Lease term", "Job fit", "New routines", "Local ties"],
        futureImpact: "What felt temporary starts to feel like your base.",
        expansion: null,
      },
    ],
    hiddenFutures: [
      {
        title: "The Opportunity Disappears Before You Decide",
        whyItMightHappen: buildGroundedWhy(
          "The Opportunity Disappears Before You Decide",
          bundle,
          "Job offers rarely stay open indefinitely.",
        ),
        signals: ["Pending offer", "Delayed decision", "Competing candidate", "Budget timing"],
        futureImpact: "The role goes to someone else while you are still deciding.",
        expansion: null,
      },
      {
        title: "Visiting Home Becomes More Expensive Than Expected",
        whyItMightHappen: buildGroundedWhy(
          "Visiting Home Becomes More Expensive Than Expected",
          bundle,
          "Distance makes every trip home cost more time and money than planned.",
        ),
        signals: ["Far from home", "Flight costs", "Holiday travel", "Old ties"],
        futureImpact: "You visit less often than you first imagined.",
        expansion: null,
      },
      {
        title: "Your Daily Life Stays Exactly The Same",
        whyItMightHappen: buildGroundedWhy(
          "Your Daily Life Stays Exactly The Same",
          bundle,
          "Staying put keeps the current routine intact.",
        ),
        signals: ["Current city", "Existing network", "No move yet", "Stable role"],
        futureImpact: "The offer becomes a what-if story instead of a new chapter.",
        expansion: null,
      },
    ],
    blindSpotFutures: [
      {
        title: "You Renew Your Lease After One Year",
        whyItMightHappen: buildGroundedWhy(
          "You Renew Your Lease After One Year",
          bundle,
          "A workable job and routine can turn a tentative move into a longer stay.",
        ),
        signals: ["Lease term", "Job fit", "New routines", "Local ties"],
        futureImpact: "What felt temporary starts to feel like your base.",
        expansion: null,
      },
      {
        title: "Most New Friendships Begin At Work",
        whyItMightHappen: buildGroundedWhy(
          "Most New Friendships Begin At Work",
          bundle,
          "A new job becomes the main place you meet people when you move alone.",
        ),
        signals: ["New job", "Coworker lunches", "Team events", "Limited existing ties"],
        futureImpact: "Your social life starts revolving around colleagues.",
        expansion: null,
      },
      {
        title: "The Job Matters Less Than The New Life You Build",
        whyItMightHappen: buildGroundedWhy(
          "The Job Matters Less Than The New Life You Build",
          bundle,
          "Daily routines outside the office can become the reason you stay.",
        ),
        signals: ["New routines", "Local friendships", "Weekend plans", "Apartment setup"],
        futureImpact: "The move stops being only about the role.",
        expansion: null,
      },
    ],
  };
}

function buildBusinessFallbacks(bundle: GroundingBundle): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  return {
    activeFutures: [
      {
        title: "The First 10 Users Arrive",
        whyItMightHappen: buildGroundedWhy(
          "The First 10 Users Arrive",
          bundle,
          "Early outreach and a simple MVP can attract the first real users quickly.",
        ),
        signals: ["Early launch", "Simple MVP", "Direct outreach", "First customers"],
        futureImpact: "Real usage starts replacing theory within weeks.",
        expansion: null,
      },
      {
        title: "Early Feedback Changes The Product",
        whyItMightHappen: buildGroundedWhy(
          "Early Feedback Changes The Product",
          bundle,
          "Real users reveal what the product should actually do.",
        ),
        signals: ["User interviews", "Beta testers", "Feature requests", "Usage data"],
        futureImpact: "The roadmap shifts after the first serious feedback.",
        expansion: null,
      },
      {
        title: "Launch Slips By Several Months",
        whyItMightHappen: buildGroundedWhy(
          "Launch Slips By Several Months",
          bundle,
          "Building, testing, and life timing often push the first launch later.",
        ),
        signals: ["Scope growth", "Part-time build", "Testing cycles", "Life timing"],
        futureImpact: "The public launch moves from this season to the next.",
        expansion: null,
      },
      {
        title: "The MVP Solves A Different Problem Than Expected",
        whyItMightHappen: buildGroundedWhy(
          "The MVP Solves A Different Problem Than Expected",
          bundle,
          "Usage often reveals a sharper problem than the original idea assumed.",
        ),
        signals: ["Early users", "Unexpected use cases", "Feature misuse", "New demand"],
        futureImpact: "The product pivots toward what users actually use.",
        expansion: null,
      },
    ],
    hiddenFutures: [
      {
        title: "The Wrong Audience Loves It",
        whyItMightHappen: buildGroundedWhy(
          "The Wrong Audience Loves It",
          bundle,
          "Early traction can come from users you did not originally target.",
        ),
        signals: ["Unexpected users", "Strong niche fit", "Surprising retention", "New segment"],
        futureImpact: "You rebuild the go-to-market around an unplanned audience.",
        expansion: null,
      },
      {
        title: "An Early User Becomes Your Biggest Advocate",
        whyItMightHappen: buildGroundedWhy(
          "An Early User Becomes Your Biggest Advocate",
          bundle,
          "One enthusiastic early user can shape momentum more than marketing.",
        ),
        signals: ["Power user", "Referrals", "Testimonials", "Repeat usage"],
        futureImpact: "Word of mouth starts carrying the product forward.",
        expansion: null,
      },
      {
        title: "Building Stops Feeling Fun",
        whyItMightHappen: buildGroundedWhy(
          "Building Stops Feeling Fun",
          bundle,
          "Long solo building stretches can drain motivation before traction arrives.",
        ),
        signals: ["Long build", "Slow feedback", "Solo effort", "Delayed launch"],
        futureImpact: "Momentum drops before the next milestone feels reachable.",
        expansion: null,
      },
      {
        title: "A Competitor Launches First",
        whyItMightHappen: buildGroundedWhy(
          "A Competitor Launches First",
          bundle,
          "Similar ideas often reach the market while you are still building.",
        ),
        signals: ["Market timing", "Similar products", "Delayed launch", "Category heat"],
        futureImpact: "You enter a market that already has a visible alternative.",
        expansion: null,
      },
    ],
    blindSpotFutures: [
      {
        title: "Graduation Creates More Time Than Expected",
        whyItMightHappen: buildGroundedWhy(
          "Graduation Creates More Time Than Expected",
          bundle,
          "A major life transition can open more build time than planned.",
        ),
        signals: ["Graduation", "Schedule change", "Less coursework", "New routine"],
        futureImpact: "The project gets more focused hours after the transition.",
        expansion: null,
      },
      {
        title: "A Job Offer Delays The Launch",
        whyItMightHappen: buildGroundedWhy(
          "A Job Offer Delays The Launch",
          bundle,
          "Income pressure can push the business behind employment.",
        ),
        signals: ["Job search", "Income need", "Offer timing", "Split focus"],
        futureImpact: "Launch moves to nights and weekends for a while.",
        expansion: null,
      },
      {
        title: "An Early User Wants To Help Build It",
        whyItMightHappen: buildGroundedWhy(
          "An Early User Wants To Help Build It",
          bundle,
          "Strong early believers sometimes offer more than feedback.",
        ),
        signals: ["Power user", "Frequent feedback", "Shared excitement", "Skill overlap"],
        futureImpact: "A user becomes part of the build process.",
        expansion: null,
      },
      {
        title: "The Business Becomes A Side Project",
        whyItMightHappen: buildGroundedWhy(
          "The Business Becomes A Side Project",
          bundle,
          "Other priorities can keep the idea alive without full commitment.",
        ),
        signals: ["Split focus", "Income need", "Life timing", "Slow progress"],
        futureImpact: "Progress continues, but only in spare hours.",
        expansion: null,
      },
    ],
  };
}

function buildGenericFallbacks(situationTitle: string, bundle: GroundingBundle): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  return {
    activeFutures: [
      {
        title: "Your Routine Settles Into A New Normal",
        whyItMightHappen: buildGroundedWhy(
          "Your Routine Settles Into A New Normal",
          bundle,
          `Events around "${situationTitle}" keep unfolding in a concrete direction.`,
        ),
        signals: ["Recent change", "Active decision", "New circumstances", "Open timeline"],
        futureImpact: "Daily life looks noticeably different within a few months.",
        expansion: null,
      },
      {
        title: "The Timeline Stretches Longer Than You Expected",
        whyItMightHappen: buildGroundedWhy(
          "The Timeline Stretches Longer Than You Expected",
          bundle,
          `Life around "${situationTitle}" may last longer than first assumed.`,
        ),
        signals: ["New routines", "Unexpected fit", "Changing priorities", "Old ties fading"],
        futureImpact: "A temporary situation starts to feel permanent.",
        expansion: null,
      },
      {
        title: "A Smaller Detail Becomes The Main Story",
        whyItMightHappen: buildGroundedWhy(
          "A Smaller Detail Becomes The Main Story",
          bundle,
          "A side effect may become more important than expected.",
        ),
        signals: ["Side effects", "Relationship shifts", "Delayed reactions", "Background tradeoffs"],
        futureImpact: "What felt secondary starts driving the next year.",
        expansion: null,
      },
      {
        title: "Momentum Builds Faster Than Planned",
        whyItMightHappen: buildGroundedWhy(
          "Momentum Builds Faster Than Planned",
          bundle,
          "Once action starts, consequences can compound quickly.",
        ),
        signals: ["Recent decision", "Visible progress", "New feedback", "Changed routine"],
        futureImpact: "The next few months move faster than expected.",
        expansion: null,
      },
    ],
    hiddenFutures: [
      {
        title: "An Overlooked Tradeoff Becomes Hard To Ignore",
        whyItMightHappen: buildGroundedWhy(
          "An Overlooked Tradeoff Becomes Hard To Ignore",
          bundle,
          "Secondary consequences can become central over time.",
        ),
        signals: ["Hidden costs", "Delayed effects", "Side consequences", "Background tension"],
        futureImpact: "What felt minor starts shaping daily choices.",
        expansion: null,
      },
      {
        title: "Timing Shifts The Outcome",
        whyItMightHappen: buildGroundedWhy(
          "Timing Shifts The Outcome",
          bundle,
          "When something happens can matter as much as what happens.",
        ),
        signals: ["Calendar pressure", "External timing", "Competing events", "Delayed action"],
        futureImpact: "The same choice plays out differently than expected.",
        expansion: null,
      },
      {
        title: "Someone Else Moves First",
        whyItMightHappen: buildGroundedWhy(
          "Someone Else Moves First",
          bundle,
          "Other people’s choices can reshape your options.",
        ),
        signals: ["Outside actors", "Changed dynamics", "New competition", "Lost window"],
        futureImpact: "The situation changes before you commit.",
        expansion: null,
      },
    ],
    blindSpotFutures: [
      {
        title: "A Detail You Mentioned Becomes Central",
        whyItMightHappen: buildGroundedWhy(
          "A Detail You Mentioned Becomes Central",
          bundle,
          "Small context details can drive the real outcome.",
        ),
        signals: ["Personal detail", "Constraint named", "Timing note", "Relationship factor"],
        futureImpact: "The future turns on something that seemed secondary.",
        expansion: null,
      },
      {
        title: "The Decision Lasts Longer Than Expected",
        whyItMightHappen: buildGroundedWhy(
          "The Decision Lasts Longer Than Expected",
          bundle,
          "Important choices often echo longer than planned.",
        ),
        signals: ["Long timeline", "Repeated effects", "New routines", "Changed priorities"],
        futureImpact: "The choice keeps shaping life after the first month.",
        expansion: null,
      },
      {
        title: "An Unexpected Opportunity Appears",
        whyItMightHappen: buildGroundedWhy(
          "An Unexpected Opportunity Appears",
          bundle,
          "New options often emerge once a decision is in motion.",
        ),
        signals: ["New information", "Outside offer", "Changed context", "Fresh opening"],
        futureImpact: "A path you had not weighed becomes realistic.",
        expansion: null,
      },
    ],
  };
}

export function buildSituationFallbackFutures(
  situationTitle: string,
  bundle?: GroundingBundle,
): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  const groundingBundle =
    bundle ??
    buildGroundingBundle({
      situationTitle,
      contextSummary: null,
      selectedPathTitle: null,
    });
  const lower = situationTitle.toLowerCase();
  const domain = detectSituationDomain(situationTitle);

  if (/\b(girl|guy|boy|crush|like|dating|relationship|work crush)\b/.test(lower) || domain === "work-crush") {
    return buildRelationshipFallbacks(groundingBundle);
  }

  if (
    /\b(dallas|move|relocat|new city|new job|moved to|moving to|job offer|might get a job)\b/.test(lower) ||
    domain === "relocation"
  ) {
    return buildRelocationFallbacks(groundingBundle);
  }

  if (domain === "business" || /\b(starting a business|start a business|thinking about starting)\b/.test(lower)) {
    return buildBusinessFallbacks(groundingBundle);
  }

  return buildGenericFallbacks(situationTitle, groundingBundle);
}

function filterGroundedFutures(futures: ScannableFuture[], bundle: GroundingBundle): ScannableFuture[] {
  return futures
    .map((future) => sanitizeFuture(future, bundle))
    .filter((future) => future.title.length > 0 && isValidRealityFuture(future, bundle));
}

function fillSection(
  generated: ScannableFuture[],
  fallback: ScannableFuture[],
  bundle: GroundingBundle,
  limits: { min: number; max: number },
  recoveryInput?: ForecastRecoveryInput,
): ScannableFuture[] {
  let groundedGenerated = filterGroundedFutures(generated, bundle);

  if (recoveryInput && shouldRunRecoveryGeneration(groundedGenerated.length)) {
    const recovered = filterGroundedFutures(generateRecoveredFutures(recoveryInput, bundle), bundle);
    groundedGenerated = uniqueRealityFutures([...groundedGenerated, ...recovered], limits.max);
  }

  const groundedFallback = filterGroundedFutures(fallback, bundle);
  let merged = uniqueRealityFutures([...groundedGenerated, ...groundedFallback], limits.max);

  if (merged.length < limits.min) {
    for (const candidate of groundedFallback) {
      if (merged.length >= limits.min) {
        break;
      }

      const key = normalizeComparable(candidate.title);
      if (!merged.some((future) => normalizeComparable(future.title) === key)) {
        merged.push(candidate);
      }
    }
  }

  if (merged.length < limits.min) {
    for (const candidate of groundedGenerated) {
      if (merged.length >= limits.min) {
        break;
      }

      const key = normalizeComparable(candidate.title);
      if (!merged.some((future) => normalizeComparable(future.title) === key)) {
        merged.push(candidate);
      }
    }
  }

  return merged.slice(0, limits.max);
}

function buildSignalsFromGeneratedFuture(draft: ForecastFutureDraft): string[] {
  const candidates = [draft.title, draft.why, draft.impact]
    .map((value) => toShortPhrase(value, 44))
    .filter((value) => value.length > 0);

  const seen = new Set<string>();
  const signals: string[] = [];

  for (const candidate of candidates) {
    const key = normalizeComparable(candidate);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    signals.push(toTitleCase(candidate));

    if (signals.length >= MAX_SIGNALS) {
      break;
    }
  }

  return signals.length >= MIN_SIGNALS
    ? signals
    : [...signals, "Named decision", "Current momentum", "Open timeline"].slice(0, MAX_SIGNALS);
}

function mapGeneratedFutureToScannableFuture(
  draft: ForecastFutureDraft,
  bundle: GroundingBundle,
): ScannableFuture {
  const title = resolveForecastTitle(draft.title, bundle) || formatForecastTitle(draft.title);
  const futureImpact =
    formatForecastImpact(draft.impact, bundle) ||
    recoverFutureImpact(draft.impact, bundle) ||
    toFirstSentence(draft.impact, 140);

  return sanitizeFuture(
    {
      title,
      whyItMightHappen: buildGroundedWhy(title, bundle, toFirstSentence(draft.why, 160)),
      signals: buildSignalsFromGeneratedFuture(draft),
      futureImpact,
      expansion: null,
      sourceTrace: buildSourceTrace(bundle),
    },
    bundle,
  );
}

export function processGeneratedForecastSections(
  generated: ForecastOutput,
  situationTitle: string,
  contextSummary?: string | null,
  selectedPathTitle?: string | null,
  pathText: string[] = [],
): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  const contextTitle = selectedPathTitle ? `${situationTitle} — ${selectedPathTitle}` : situationTitle;
  const bundle = buildGroundingBundle({
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle: selectedPathTitle ?? null,
    pathText,
  });
  const fallbacks = buildSituationFallbackFutures(contextTitle, bundle);
  const recoveryInput: ForecastRecoveryInput = {
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle: selectedPathTitle ?? null,
    reasoningSources: [
      ...generated.active.flatMap((future) => [future.title, future.why, future.impact]),
      ...generated.hidden.flatMap((future) => [future.title, future.why, future.impact]),
      ...generated.blind_spots.flatMap((future) => [future.title, future.why, future.impact]),
      ...pathText,
    ],
  };

  const activeGenerated = generated.active.map((draft) => mapGeneratedFutureToScannableFuture(draft, bundle));
  const hiddenGenerated = generated.hidden.map((draft) => mapGeneratedFutureToScannableFuture(draft, bundle));
  const blindSpotGenerated = generated.blind_spots.map((draft) =>
    mapGeneratedFutureToScannableFuture(draft, bundle),
  );

  return {
    activeFutures: fillSection(activeGenerated, fallbacks.activeFutures, bundle, {
      min: MIN_ACTIVE_FUTURES,
      max: MAX_ACTIVE_FUTURES,
    }, recoveryInput),
    hiddenFutures: fillSection(hiddenGenerated, fallbacks.hiddenFutures, bundle, {
      min: MIN_HIDDEN_FUTURES,
      max: MAX_HIDDEN_FUTURES,
    }, recoveryInput),
    blindSpotFutures: fillSection(blindSpotGenerated, fallbacks.blindSpotFutures, bundle, {
      min: MIN_BLIND_SPOT_FUTURES,
      max: MAX_BLIND_SPOT_FUTURES,
    }, recoveryInput),
  };
}

function buildContextBlindSpotFutures(
  contextSummary: string | null,
  situationTitle: string,
  selectedPathTitle?: string,
): ScannableFuture[] {
  const bundle = `${situationTitle}\n${contextSummary ?? ""}\n${selectedPathTitle ?? ""}`.toLowerCase();
  const path = selectedPathTitle?.toLowerCase() ?? "";

  if (
    /\b(girl|guy|crush|work|colleague)\b/.test(bundle) &&
    /friendship first|build closer|stay connected/.test(path)
  ) {
    return [
      {
        title: "She Assumes You're Not Interested",
        whyItMightHappen: "Platonic behavior can read as disinterest over time.",
        signals: ["Daily work contact", "No romantic signals", "Friendship-first approach", "Mixed messages"],
        futureImpact: "She stops looking for signs because the friendship feels settled.",
        expansion: null,
      },
      {
        title: "A One-On-One Opportunity Appears Naturally",
        whyItMightHappen: "Shared projects or social plans can create private time.",
        signals: ["After-work invite", "Shared project", "Team event", "Mutual friend"],
        futureImpact: "You finally talk outside the usual work routine.",
        expansion: null,
      },
      {
        title: "A Coworker Makes A Move First",
        whyItMightHappen: "Workplace proximity puts others in the same position.",
        signals: ["New hire", "Team reshuffle", "Shared schedule", "Outside dating life"],
        futureImpact: "She starts spending breaks with someone else.",
        expansion: null,
      },
      {
        title: "You Never Learn How She Feels",
        whyItMightHappen: "Without a direct move, ambiguity can last indefinitely.",
        signals: ["Limited alone time", "Polite friendship", "No clear signals", "Long timeline"],
        futureImpact: "The answer stays unknown even after months of contact.",
        expansion: null,
      },
    ];
  }

  if (
    /\b(girl|guy|crush|work|colleague)\b/.test(bundle) &&
    /ask her out|direct approach|change the context/.test(path)
  ) {
    return [
      {
        title: "She Says Yes On The First Ask",
        whyItMightHappen: "A clear moment can cut through months of ambiguity.",
        signals: ["Outside-work invite", "Direct question", "Private setting", "Mutual rapport"],
        futureImpact: "Plans move from lunch at work to a date that week.",
        expansion: null,
      },
      {
        title: "She Says No But Stays Friendly At Work",
        whyItMightHappen: "A direct ask can end uncertainty without ending contact.",
        signals: ["Clear question", "Existing rapport", "Professional setting", "Honest answer"],
        futureImpact: "The crush fades but daily work stays workable.",
        expansion: null,
      },
      {
        title: "A Coworker Overhears And It Gets Awkward",
        whyItMightHappen: "Workplace moments rarely stay fully private.",
        signals: ["Open office", "Shared team", "Break room", "Office gossip"],
        futureImpact: "Small talk feels strained for a few weeks.",
        expansion: null,
      },
    ];
  }

  if (/\b(dallas|move|relocat|new city|cousin|job|job offer|might get a job)\b/.test(bundle) && /take the job|take the opportunity/.test(path)) {
    return [
      {
        title: "Most New Friendships Begin At Work",
        whyItMightHappen: buildGroundedWhy(
          "Most New Friendships Begin At Work",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "A new job becomes the main place you meet people when you move alone.",
        ),
        signals: ["New job", "Coworker lunches", "Team events", "Limited existing ties"],
        futureImpact: "Your social life starts revolving around colleagues.",
        expansion: null,
      },
      {
        title: "You Renew Your Lease After One Year",
        whyItMightHappen: buildGroundedWhy(
          "You Renew Your Lease After One Year",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "A good fit can turn a trial move into a longer chapter.",
        ),
        signals: ["Lease term", "Job fit", "New routines", "Local ties"],
        futureImpact: "What felt temporary starts to feel permanent.",
        expansion: null,
      },
      {
        title: "Visiting Home Becomes More Expensive Than Expected",
        whyItMightHappen: buildGroundedWhy(
          "Visiting Home Becomes More Expensive Than Expected",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "Distance makes every trip home cost more time and money than planned.",
        ),
        signals: ["Far from home", "Flight costs", "Holiday travel", "Old ties"],
        futureImpact: "You visit less often than you first imagined.",
        expansion: null,
      },
      {
        title: "The Job Matters Less Than The New Life You Build",
        whyItMightHappen: buildGroundedWhy(
          "The Job Matters Less Than The New Life You Build",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "Daily routines outside the office can become the reason you stay.",
        ),
        signals: ["New routines", "Local friendships", "Weekend plans", "Apartment setup"],
        futureImpact: "The move stops being only about the role.",
        expansion: null,
      },
    ];
  }

  if (/\b(dallas|move|relocat|new city|cousin|job)\b/.test(bundle)) {
    return [
      {
        title: "Homesickness Hits After The Initial Excitement Fades",
        whyItMightHappen: buildGroundedWhy(
          "Homesickness Hits After The Initial Excitement Fades",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "Novelty fades before new roots feel solid.",
        ),
        signals: ["Holiday visit", "Far from home", "Fresh start fatigue", "Old friendships"],
        futureImpact: "Home starts to feel louder than the move.",
        expansion: null,
      },
      {
        title: "The Job Lasts Longer Than Planned",
        whyItMightHappen: buildGroundedWhy(
          "The Job Lasts Longer Than Planned",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "A good fit can turn a trial move into a longer chapter.",
        ),
        signals: ["Lease renewal", "Promotion path", "New routines", "Local ties"],
        futureImpact: "What felt temporary starts to feel permanent.",
        expansion: null,
      },
    ];
  }

  if (/\b(startup|business|launch|product|users|company|founder|mvp)\b/.test(bundle)) {
    return [
      {
        title: "Graduation Creates More Time Than Expected",
        whyItMightHappen: buildGroundedWhy(
          "Graduation Creates More Time Than Expected",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "A major life transition can open more build time than planned.",
        ),
        signals: ["Graduation", "Schedule change", "Less coursework", "New routine"],
        futureImpact: "The project gets more focused hours after the transition.",
        expansion: null,
      },
      {
        title: "A Job Offer Delays The Launch",
        whyItMightHappen: buildGroundedWhy(
          "A Job Offer Delays The Launch",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "Income pressure can push the business behind employment.",
        ),
        signals: ["Job search", "Income need", "Offer timing", "Split focus"],
        futureImpact: "Launch moves to nights and weekends for a while.",
        expansion: null,
      },
      {
        title: "An Early User Wants To Help Build It",
        whyItMightHappen: buildGroundedWhy(
          "An Early User Wants To Help Build It",
          buildGroundingBundle({ situationTitle, contextSummary, selectedPathTitle: selectedPathTitle ?? null }),
          "Strong early believers sometimes offer more than feedback.",
        ),
        signals: ["Power user", "Frequent feedback", "Shared excitement", "Skill overlap"],
        futureImpact: "A user becomes part of the build process.",
        expansion: null,
      },
    ];
  }

  return [];
}

function buildSelectedPathForecastSections(
  selectedPath: MockPathDraft,
  situationTitle: string,
  selectedPathTitle: string,
  contextSummary?: string | null,
): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  const contextTitle = `${situationTitle} — ${selectedPathTitle}`;
  const bundle = buildGroundingBundle({
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle,
    pathText: [
      selectedPath.description,
      ...selectedPath.benefits,
      ...selectedPath.consequences,
      selectedPath.future_shift,
    ],
  });
  const fallbacks = buildSituationFallbackFutures(contextTitle, bundle);

  const activeGenerated = selectedPath.benefits
    .map((benefit) =>
      buildRealityFuture(
        benefit,
        { ...selectedPath, description: benefit },
        bundle,
        selectedPath.future_shift,
        null,
      ),
    )
    .filter((future): future is ScannableFuture => future !== null);

  const hiddenGenerated = selectedPath.consequences
    .map((consequence) =>
      buildRealityFuture(
        consequence,
        {
          ...selectedPath,
          consequences: [
            consequence,
            ...selectedPath.consequences.filter((item) => item !== consequence),
          ],
        },
        bundle,
        selectedPath.future_shift,
        null,
      ),
    )
    .filter((future): future is ScannableFuture => future !== null);

  const blindSpotGenerated = [
    ...buildContextBlindSpotFutures(contextSummary ?? null, situationTitle, selectedPathTitle),
    buildBlindSpotRealityFuture(selectedPath, null, bundle),
    buildRealityFuture(
      selectedPath.future_shift,
      selectedPath,
      bundle,
      selectedPath.future_shift,
      null,
    ),
  ].filter((future): future is ScannableFuture => future !== null);

  const recoveryInput: ForecastRecoveryInput = {
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle,
    reasoningSources: [
      selectedPath.description,
      ...selectedPath.benefits,
      ...selectedPath.consequences,
      selectedPath.future_shift,
    ],
  };

  return {
    activeFutures: fillSection(activeGenerated, fallbacks.activeFutures, bundle, {
      min: MIN_ACTIVE_FUTURES,
      max: MAX_ACTIVE_FUTURES,
    }, recoveryInput),
    hiddenFutures: fillSection(hiddenGenerated, fallbacks.hiddenFutures, bundle, {
      min: MIN_HIDDEN_FUTURES,
      max: MAX_HIDDEN_FUTURES,
    }, recoveryInput),
    blindSpotFutures: fillSection(blindSpotGenerated, fallbacks.blindSpotFutures, bundle, {
      min: MIN_BLIND_SPOT_FUTURES,
      max: MAX_BLIND_SPOT_FUTURES,
    }, recoveryInput),
  };
}

export function buildRealityForecastSections(
  paths: MockPathDraft[],
  futureSelves: MockFutureSelfDraft[],
  situationTitle: string,
  selectedPath?: MockPathDraft | null,
  selectedPathTitle?: string,
  contextSummary?: string | null,
): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  if (selectedPath && selectedPathTitle) {
    return buildSelectedPathForecastSections(
      selectedPath,
      situationTitle,
      selectedPathTitle,
      contextSummary,
    );
  }

  const bundle = buildGroundingBundle({
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle: null,
    pathText: paths.flatMap((path) => [
      path.description,
      ...path.benefits,
      ...path.consequences,
      path.future_shift,
    ]),
  });
  const fallbacks = buildSituationFallbackFutures(situationTitle, bundle);

  const activeGenerated = paths
    .flatMap((path) =>
      [...path.benefits, path.future_shift, path.description].map((source) =>
        buildRealityFuture(source, path, bundle, path.future_shift || source, null),
      ),
    )
    .filter((future): future is ScannableFuture => future !== null);

  const hiddenGenerated = paths
    .flatMap((path) =>
      path.consequences.map((consequence) =>
        buildRealityFuture(consequence, path, bundle, consequence, null),
      ),
    )
    .filter((future): future is ScannableFuture => future !== null);

  const blindSpotGenerated = paths
    .flatMap((path, index) => [
      buildBlindSpotRealityFuture(path, futureSelves[index] ?? futureSelves[0] ?? null, bundle),
      buildRealityFuture(path.future_shift, path, bundle, path.future_shift, null),
      ...path.consequences.map((consequence) =>
        buildRealityFuture(consequence, path, bundle, path.future_shift, null),
      ),
    ])
    .filter((future): future is ScannableFuture => future !== null);

  const recoveryInput: ForecastRecoveryInput = {
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle: null,
    reasoningSources: paths.flatMap((path) => [
      path.description,
      ...path.benefits,
      ...path.consequences,
      path.future_shift,
    ]),
  };

  return {
    activeFutures: fillSection(activeGenerated, fallbacks.activeFutures, bundle, {
      min: MIN_ACTIVE_FUTURES,
      max: MAX_ACTIVE_FUTURES,
    }, recoveryInput),
    hiddenFutures: fillSection(hiddenGenerated, fallbacks.hiddenFutures, bundle, {
      min: MIN_HIDDEN_FUTURES,
      max: MAX_HIDDEN_FUTURES,
    }, recoveryInput),
    blindSpotFutures: fillSection(blindSpotGenerated, fallbacks.blindSpotFutures, bundle, {
      min: MIN_BLIND_SPOT_FUTURES,
      max: MAX_BLIND_SPOT_FUTURES,
    }, recoveryInput),
  };
}

export function withRealityForecastFallbacks(
  sections: {
    activeFutures: ScannableFuture[];
    hiddenFutures: ScannableFuture[];
    blindSpotFutures: ScannableFuture[];
  },
  situationTitle: string,
  contextSummary?: string | null,
): {
  activeFutures: ScannableFuture[];
  hiddenFutures: ScannableFuture[];
  blindSpotFutures: ScannableFuture[];
} {
  const bundle = buildGroundingBundle({
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle: null,
  });
  const fallbacks = buildSituationFallbackFutures(situationTitle, bundle);
  const recoveryInput: ForecastRecoveryInput = {
    situationTitle,
    contextSummary: contextSummary ?? null,
    selectedPathTitle: null,
    reasoningSources: [
      ...sections.activeFutures.map((future) => future.title),
      ...sections.hiddenFutures.map((future) => future.title),
      ...sections.blindSpotFutures.map((future) => future.title),
    ],
  };

  return {
    activeFutures: fillSection(sections.activeFutures, fallbacks.activeFutures, bundle, {
      min: MIN_ACTIVE_FUTURES,
      max: MAX_ACTIVE_FUTURES,
    }, recoveryInput),
    hiddenFutures: fillSection(sections.hiddenFutures, fallbacks.hiddenFutures, bundle, {
      min: MIN_HIDDEN_FUTURES,
      max: MAX_HIDDEN_FUTURES,
    }, recoveryInput),
    blindSpotFutures: fillSection(sections.blindSpotFutures, fallbacks.blindSpotFutures, bundle, {
      min: MIN_BLIND_SPOT_FUTURES,
      max: MAX_BLIND_SPOT_FUTURES,
    }, recoveryInput),
  };
}
