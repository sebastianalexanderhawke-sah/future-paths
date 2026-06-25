import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";

const MAX_COMPARISON_ITEMS = 3;
const TRAIT_RANK_LIMIT = 4;

export type MonthlyComparison = {
  traitsMorePresent: string[];
  traitsLessPresent: string[];
};

/**
 * Ranks by frequency, first-seen order as the tiebreak (stable sort) — same
 * shape as the private ranking helper in monthly-identity-evolution.ts, but
 * reimplemented here since that one isn't exported and this module must not
 * change the aggregation layer.
 */
function rankByFrequency(items: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}

/**
 * Diffs two already-ranked lists: an item that's new or climbed rank counts
 * as increased; an item that's gone or fallen rank counts as decreased. When
 * `previous` is empty (no prior month to compare against), every item in
 * `current` is necessarily "new" — increased — and nothing can decrease,
 * since there's nothing in `previous` to fall away from. That's what makes
 * this safe to reuse for both baseline months and real comparisons.
 */
function diffRankedLists(
  current: string[],
  previous: string[],
): { increased: string[]; decreased: string[] } {
  const increased: string[] = [];
  const decreased: string[] = [];

  for (const item of current) {
    const previousRank = previous.indexOf(item);

    if (previousRank === -1) {
      increased.push(item);
      continue;
    }

    const currentRank = current.indexOf(item);
    if (currentRank < previousRank) {
      increased.push(item);
    }
  }

  for (const item of previous) {
    const currentRank = current.indexOf(item);

    if (currentRank === -1) {
      decreased.push(item);
      continue;
    }

    const previousRank = previous.indexOf(item);
    if (currentRank > previousRank) {
      decreased.push(item);
    }
  }

  return { increased, decreased };
}

/**
 * Traits are ranked from a narrower pool than themes: only the themes
 * attached to that month's identityUpdates (direct evidence of an identity
 * shift), not the broader pool that also includes chosen-path and
 * future-event themes (dominantThemes). This is also why traits work as a
 * baseline signal — a month's strongest identity evidence, independent of
 * whether a previous month exists to compare against.
 */
function traitPool(month: MonthlyIdentityEvolution): string[] {
  return month.identityChangeEvidence.identityUpdates.flatMap((update) => update.themes);
}

/**
 * Compares a month's identity-update evidence against the previous month's,
 * or against no prior evidence at all when `previous` is null — the
 * earliest month on record. In that baseline case every trait the month's
 * identityUpdates actually support shows up as "more present" (there's
 * nothing it could have lost ground against), and traitsLessPresent is
 * always empty: nothing is invented as a decline.
 */
export function computeMonthlyComparison(
  current: MonthlyIdentityEvolution,
  previous: MonthlyIdentityEvolution | null,
): MonthlyComparison {
  const currentRanked = rankByFrequency(traitPool(current), TRAIT_RANK_LIMIT);
  const previousRanked = rankByFrequency(previous ? traitPool(previous) : [], TRAIT_RANK_LIMIT);
  const traitChanges = diffRankedLists(currentRanked, previousRanked);

  return {
    traitsMorePresent: traitChanges.increased.slice(0, MAX_COMPARISON_ITEMS),
    traitsLessPresent: traitChanges.decreased.slice(0, MAX_COMPARISON_ITEMS),
  };
}
