import type { ForecastSections } from "@/components/home/forecast-utils";
import type { Forecast } from "@/types/database";

// ---------------------------------------------------------------------------
// Title normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a future title before comparison so that casing differences,
 * leading/trailing whitespace, and Unicode typography artefacts from JSONB
 * serialisation do not cause false "new" mismatches between forecast versions.
 *
 * Applied to BOTH sides of every title comparison.
 */
export const normalizeTitle = (t: string): string =>
  t
    .trim()
    .toLowerCase()
    // Smart single quotes → apostrophe
    .replace(/[\u2018\u2019]/g, "'")
    // Smart double quotes → straight double quotes
    .replace(/[\u201C\u201D]/g, '"')
    // Em dash → double hyphen
    .replace(/\u2014/g, "--")
    // En dash → single hyphen
    .replace(/\u2013/g, "-");

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Rank 1 (best) = active, 2 = hidden, 3 = blind spot, 4 = wild card. */
function getSectionRank(sections: ForecastSections, title: string): number | null {
  const norm = normalizeTitle(title);
  if (sections.activeFutures.some((f) => normalizeTitle(f.title) === norm)) return 1;
  if (sections.hiddenFutures.some((f) => normalizeTitle(f.title) === norm)) return 2;
  if (sections.blindSpotFutures.some((f) => normalizeTitle(f.title) === norm)) return 3;
  if (sections.wildCardFutures?.some((f) => normalizeTitle(f.title) === norm)) return 4;
  return null;
}

/** Returns a Set of **normalised** titles from all sections. */
function allNormalizedTitles(sections: ForecastSections): Set<string> {
  return new Set([
    ...sections.activeFutures.map((f) => normalizeTitle(f.title)),
    ...sections.hiddenFutures.map((f) => normalizeTitle(f.title)),
    ...sections.blindSpotFutures.map((f) => normalizeTitle(f.title)),
    ...(sections.wildCardFutures ?? []).map((f) => normalizeTitle(f.title)),
  ]);
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Keys are **normalised** titles. Callers should normalise before `.has()`
 * lookups: `diff.appeared.has(normalizeTitle(future.title))`.
 */
export type ForecastDiff = {
  disappeared: Set<string>;
  appeared: Set<string>;
};

export type FutureMovement = "up" | "down" | "neutral" | "new";

// ---------------------------------------------------------------------------
// computeForecastDiff
// ---------------------------------------------------------------------------

/**
 * Computes which futures disappeared (in previous but not in current) and
 * which appeared (in current but not in previous), matched by **normalised**
 * title. Keys in the returned Sets are normalised.
 */
export function computeForecastDiff(
  previous: ForecastSections,
  current: ForecastSections,
): ForecastDiff {
  const prevTitles = allNormalizedTitles(previous);
  const currTitles = allNormalizedTitles(current);

  const disappeared = new Set<string>();
  for (const t of prevTitles) {
    if (!currTitles.has(t)) disappeared.add(t);
  }

  const appeared = new Set<string>();
  for (const t of currTitles) {
    if (!prevTitles.has(t)) appeared.add(t);
  }

  return { disappeared, appeared };
}

// ---------------------------------------------------------------------------
// flattenFutures
// ---------------------------------------------------------------------------

/**
 * Returns ranked futures for tiered display (excludes wild cards).
 * activeFutures → hiddenFutures → blindSpotFutures
 */
export function flattenFutures(
  sections: ForecastSections,
): ForecastSections["activeFutures"] {
  return [
    ...sections.activeFutures,
    ...sections.hiddenFutures,
    ...sections.blindSpotFutures,
  ];
}

// ---------------------------------------------------------------------------
// computeMovementMap
// ---------------------------------------------------------------------------

/**
 * Builds a movement map (original title → movement) comparing `current` to
 * `previous`.  Section rank comparisons use normalised titles so
 * case/whitespace differences don't cause false "new" results.
 *
 * - "new"     : normalised title not in previous at all
 * - "up"      : moved to a better-ranked section (e.g. hidden → active)
 * - "down"    : moved to a worse-ranked section (e.g. active → hidden)
 * - "neutral" : same section rank, or previous is null
 *
 * Pass `previous = null` when there is only one forecast version; every
 * future gets "neutral" and indicators should be hidden by the caller.
 */
export function computeMovementMap(
  current: ForecastSections,
  previous: ForecastSections | null,
): Record<string, FutureMovement> {
  const map: Record<string, FutureMovement> = {};
  const allCurrent = [
    ...flattenFutures(current),
    ...(current.wildCardFutures ?? []),
  ];

  for (const f of allCurrent) {
    if (!previous) {
      map[f.title] = "neutral";
      continue;
    }

    const prevRank = getSectionRank(previous, f.title);
    const currRank = getSectionRank(current, f.title)!;

    if (prevRank === null) {
      map[f.title] = "new";
    } else if (currRank < prevRank) {
      map[f.title] = "up";
    } else if (currRank > prevRank) {
      map[f.title] = "down";
    } else {
      map[f.title] = "neutral";
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// buildCheckInForecastSummary
// ---------------------------------------------------------------------------

/**
 * For a given check-in, finds the forecast generated right after it and
 * compares to the previous forecast.  Returns a short human-readable summary
 * of what changed (e.g. "2 new futures appeared · 1 resolved"), or special
 * strings "Forecast generated" / null if there is nothing to show.
 *
 * `allForecasts` must be sorted **oldest first** (ASC by generated_at).
 *
 * Title comparisons use normalised matching to avoid false diffs from
 * casing/whitespace differences.
 */
export function buildCheckInForecastSummary(
  checkIn: { id: string; created_at: string },
  allForecasts: Forecast[],
): string | null {
  if (allForecasts.length === 0) return null;

  const checkInTime = new Date(checkIn.created_at).getTime();

  // Find the first forecast generated at or after the check-in
  const afterIdx = allForecasts.findIndex(
    (f) => new Date(f.generated_at).getTime() >= checkInTime,
  );

  if (afterIdx === -1) return null;

  const afterForecast = allForecasts[afterIdx];
  const beforeForecast = afterIdx > 0 ? allForecasts[afterIdx - 1] : null;

  if (!beforeForecast) {
    return "Forecast generated";
  }

  // Trivial JSONB cast — same logic as parseForecastSections in forecasts.ts
  const current = afterForecast.sections_json as unknown as ForecastSections;
  const previous = beforeForecast.sections_json as unknown as ForecastSections;

  const { disappeared, appeared } = computeForecastDiff(previous, current);

  let movedUpCount = 0;
  let movedDownCount = 0;
  for (const f of flattenFutures(current)) {
    const prevRank = getSectionRank(previous, f.title);
    const currRank = getSectionRank(current, f.title)!;
    if (prevRank !== null && prevRank !== currRank) {
      if (currRank < prevRank) movedUpCount++;
      else movedDownCount++;
    }
  }

  const parts: string[] = [];
  const newCount = appeared.size;
  const removedCount = disappeared.size;

  if (newCount > 0) parts.push(`${newCount} new future${newCount === 1 ? "" : "s"} appeared`);
  if (removedCount > 0) parts.push(`${removedCount} resolved`);
  if (movedUpCount > 0) parts.push(`${movedUpCount} moved up`);
  if (movedDownCount > 0) parts.push(`${movedDownCount} moved down`);

  return parts.length > 0 ? parts.join(" · ") : "Forecast unchanged";
}
