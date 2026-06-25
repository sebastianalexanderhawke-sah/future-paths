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
  observations: string[];    // core traits — short bullets about who this person is
  recent_growth: string[];   // exactly 3 bullets about what is currently shifting
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

  const title = `Shaped by ${themePhrase.toLowerCase()}`;

  const futurePhrase = secondaryFuture
    ? `drawn toward both ${leadingFuture.name.toLowerCase()} and ${secondaryFuture.name.toLowerCase()}`
    : `drawn toward ${leadingFuture.name.toLowerCase()}`;

  const updatePhrase = recentUpdate
    ? ` A recent shift — ${recentUpdate.title.toLowerCase()} — may be part of that.`
    : "";

  const summary = `Someone ${futurePhrase}, with ${themePhrase.toLowerCase()} running through how they choose and follow through.${updatePhrase} Their recorded reality keeps refining that picture.`;

  // Core traits: short bullets, one phrase each, describing who the person is
  const observations: string[] = [
    `Navigates ${themes[0]?.toLowerCase() ?? "uncertainty"} as a recurring pattern`,
    `Tends to move toward ${leadingFuture.name.toLowerCase()}`,
  ];

  if (difficultTheme) {
    observations.push(`Carries unresolved ${difficultTheme.toLowerCase()}`);
  } else {
    observations.push(`Values continuity across decisions`);
  }

  if (recentUpdate) {
    observations.push(`Recently shifted — ${recentUpdate.title.toLowerCase()}`);
  } else {
    observations.push(`Relies on pattern recognition over impulsive choice`);
  }

  // Pad to meet minimum of 4 if needed (already at 4 minimum above)

  // Recent growth: exactly 3 movement bullets
  const recent_growth = [
    `Building clearer understanding of ${themes[0]?.toLowerCase() ?? "personal"} patterns`,
    secondaryFuture
      ? `Weighing ${leadingFuture.name.toLowerCase()} against ${secondaryFuture.name.toLowerCase()}`
      : `Strengthening commitment to ${leadingFuture.name.toLowerCase()}`,
    difficultTheme
      ? `Learning to sit with ${difficultTheme.toLowerCase()} without resolving it immediately`
      : `Developing more deliberate decision-making habits`,
  ];

  return {
    title,
    summary,
    themes,
    observations,
    recent_growth,
  };
}
