import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";

const MAX_COMPARISON_ITEMS = 3;

export type MonthlyComparison = {
  increased: string[];
  decreased: string[];
};

/**
 * dominantThemes already pools themes from chosen paths, identity updates,
 * and future-self events (see computeDominantThemes in
 * monthly-identity-evolution.ts) — so diffing it against the previous
 * month's ranking is also how identity-update evidence factors into the
 * comparison, without re-reading identityChangeEvidence directly.
 */
function compareThemes(
  current: MonthlyIdentityEvolution,
  previous: MonthlyIdentityEvolution,
): MonthlyComparison {
  const increased: string[] = [];
  const decreased: string[] = [];

  for (const theme of current.dominantThemes) {
    const previousRank = previous.dominantThemes.indexOf(theme);

    if (previousRank === -1) {
      increased.push(theme);
      continue;
    }

    const currentRank = current.dominantThemes.indexOf(theme);
    if (currentRank < previousRank) {
      increased.push(theme);
    }
  }

  for (const theme of previous.dominantThemes) {
    const currentRank = current.dominantThemes.indexOf(theme);

    if (currentRank === -1) {
      decreased.push(theme);
      continue;
    }

    const previousRank = previous.dominantThemes.indexOf(theme);
    if (currentRank > previousRank) {
      decreased.push(theme);
    }
  }

  return { increased, decreased };
}

function compareFutureShifts(
  current: MonthlyIdentityEvolution,
  previous: MonthlyIdentityEvolution,
): MonthlyComparison {
  const increased: string[] = [];
  const decreased: string[] = [];

  const previousDeltaByName = new Map(
    previous.futureShifts.map((shift) => [shift.futureName, shift.delta]),
  );
  const currentDeltaByName = new Map(
    current.futureShifts.map((shift) => [shift.futureName, shift.delta]),
  );

  for (const [futureName, currentDelta] of currentDeltaByName) {
    const previousDelta = previousDeltaByName.get(futureName);
    if (previousDelta === undefined) {
      continue;
    }

    if (currentDelta > previousDelta) {
      increased.push(futureName);
    } else if (currentDelta < previousDelta) {
      decreased.push(futureName);
    }
  }

  for (const futureName of previousDeltaByName.keys()) {
    if (!currentDeltaByName.has(futureName)) {
      decreased.push(futureName);
    }
  }

  return { increased, decreased };
}

/**
 * Deterministic month-over-month comparison — no AI involved. Themes are
 * weighted ahead of future-self trajectories when both lists are capped,
 * since dominantThemes is the more direct identity signal.
 */
export function computeMonthlyComparison(
  current: MonthlyIdentityEvolution,
  previous: MonthlyIdentityEvolution,
): MonthlyComparison {
  const themeChanges = compareThemes(current, previous);
  const futureShiftChanges = compareFutureShifts(current, previous);

  return {
    increased: [...themeChanges.increased, ...futureShiftChanges.increased].slice(
      0,
      MAX_COMPARISON_ITEMS,
    ),
    decreased: [...themeChanges.decreased, ...futureShiftChanges.decreased].slice(
      0,
      MAX_COMPARISON_ITEMS,
    ),
  };
}
