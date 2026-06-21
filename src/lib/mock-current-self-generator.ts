import type {
  CheckIn,
  FutureSelf,
  IdentityUpdate,
  ThemeChange,
} from "@/types/database";
import { isDifficultCheckInTheme } from "@/lib/check-in-themes";
import { CHECK_IN_THEME_NAMES, type CheckInThemeName, type ThemeName } from "@/types/enums";

export type MockCurrentSelfDraft = {
  title: string;
  summary: string;
  themes: CheckInThemeName[];
  observations: string[];
};

const THEME_COUNT_MIN = 4;
const THEME_COUNT_MAX = 6;

function themeChangeWeight(change: ThemeChange): number {
  if (change.direction === "strengthened") {
    return 3;
  }

  if (change.direction === "emerging") {
    return 2;
  }

  return 1;
}

function aggregateThemes(input: {
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes">[];
  identityUpdates: Pick<IdentityUpdate, "themes">[];
  futureSelves: Pick<FutureSelf, "themes" | "percentage">[];
}): CheckInThemeName[] {
  const scores = new Map<string, number>();

  for (const theme of input.pathThemes) {
    scores.set(theme, (scores.get(theme) ?? 0) + 1);
  }

  // Check-in theme_changes are the only source that can surface difficult
  // themes (Disappointment, Hurt, Uncertainty, ...) — paths, identity
  // updates, and future selves only ever carry the positive vocabulary.
  for (const checkIn of input.checkIns) {
    for (const change of checkIn.theme_changes) {
      scores.set(
        change.theme,
        (scores.get(change.theme) ?? 0) + themeChangeWeight(change) * 3,
      );
    }
  }

  for (const update of input.identityUpdates) {
    for (const theme of update.themes) {
      scores.set(theme, (scores.get(theme) ?? 0) + 2);
    }
  }

  for (const futureSelf of input.futureSelves) {
    for (const theme of futureSelf.themes) {
      scores.set(
        theme,
        (scores.get(theme) ?? 0) + Math.max(1, Math.round(futureSelf.percentage / 25)),
      );
    }
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme as CheckInThemeName);

  const selected = ranked.slice(0, THEME_COUNT_MAX);

  if (selected.length >= THEME_COUNT_MIN) {
    return selected;
  }

  // Thin evidence: pad with unused themes (deterministic order) so the
  // output still satisfies the schema's 4-theme floor, without claiming
  // those padding themes have particular support.
  const remaining = CHECK_IN_THEME_NAMES.filter((theme) => !selected.includes(theme));
  return [...selected, ...remaining].slice(0, THEME_COUNT_MIN);
}

function formatThemeList(themes: CheckInThemeName[]): string {
  if (themes.length === 0) {
    return "your recurring patterns";
  }

  if (themes.length === 1) {
    return themes[0];
  }

  if (themes.length === 2) {
    return `${themes[0]} and ${themes[1]}`;
  }

  return `${themes[0]}, ${themes[1]}, and ${themes[2]}`;
}

export function generateMockCurrentSelf(input: {
  momentCount: number;
  checkInCount: number;
  activeFutureSelves: FutureSelf[];
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes" | "identity_impact">[];
  identityUpdates: Pick<IdentityUpdate, "title" | "summary" | "themes">[];
}): MockCurrentSelfDraft | null {
  if (
    input.momentCount < 1 ||
    input.checkInCount < 1 ||
    input.activeFutureSelves.length < 1
  ) {
    return null;
  }

  const themes = aggregateThemes({
    pathThemes: input.pathThemes,
    checkIns: input.checkIns,
    identityUpdates: input.identityUpdates,
    futureSelves: input.activeFutureSelves,
  });

  const sortedFutures = [...input.activeFutureSelves].sort(
    (a, b) => b.percentage - a.percentage,
  );
  const leadingFuture = sortedFutures[0];
  const secondaryFuture = sortedFutures[1];
  const recentUpdate = input.identityUpdates[0];
  const themePhrase = formatThemeList(themes);
  const difficultTheme = themes.find((theme) => isDifficultCheckInTheme(theme));

  const title = `Currently shaped by ${themePhrase.toLowerCase()}`;

  const futurePhrase = secondaryFuture
    ? `${leadingFuture.name} and ${secondaryFuture.name} may both be shaping how you move forward`
    : `${leadingFuture.name} may be shaping how you move forward`;

  const updatePhrase = recentUpdate
    ? ` Your recent shift — "${recentUpdate.title.toLowerCase()}" — may reflect how this is showing up now.`
    : "";

  const summary = `Across your moments and check-ins, ${themePhrase.toLowerCase()} shows up most in how you choose and follow through. ${futurePhrase}, while your recorded reality may keep refining that picture.${updatePhrase}`;

  const observations = [
    `${themePhrase} shows up most across your recent moments, check-ins, and chosen paths.`,
    `${leadingFuture.name} currently carries the most weight among your active future selves.`,
  ];

  if (difficultTheme) {
    observations.push(
      `${difficultTheme} has appeared in recent check-ins and may not be fully resolved yet.`,
    );
  }

  if (recentUpdate) {
    observations.push(
      `A recent shift — "${recentUpdate.title.toLowerCase()}" — lines up with this pattern.`,
    );
  }

  observations.push(
    `You have recorded ${input.checkInCount} check-in${input.checkInCount === 1 ? "" : "s"} across ${input.momentCount} situation${input.momentCount === 1 ? "" : "s"} so far.`,
  );

  // Always 3 (theme + leading future + cadence) to 5 (+ difficult theme,
  // + recent update) entries — matches the schema's bounds by construction.
  return {
    title,
    summary,
    themes,
    observations,
  };
}
