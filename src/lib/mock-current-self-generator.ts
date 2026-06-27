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

  const primaryTheme = themes[0]?.toLowerCase() ?? "independence";
  const futureLabel = leadingFuture.name.toLowerCase();
  const secondaryLabel = secondaryFuture?.name.toLowerCase();

  // Title: short character phrase, not event-driven
  const title = secondaryLabel
    ? `Moving toward ${futureLabel}`
    : `Building toward ${futureLabel}`;

  // Summary: 2-3 short paragraphs, second person, character-driven
  const para1 = `You tend to move before you have everything figured out. ${themes[0] ? `${themes[0]} runs through most of your decisions` : "Action tends to come before certainty"}.`;

  const para2 = secondaryFuture
    ? `You seem pulled in two directions — toward ${futureLabel} and toward ${secondaryLabel}. That tension isn't confusion; it's just where you are right now.`
    : `You appear to learn more through doing than through planning. Once you've decided on a direction, you commit.`;

  const para3 = difficultTheme
    ? `You don't always resolve things cleanly. ${difficultTheme} surfaces and you sit with it rather than immediately fixing it.`
    : recentUpdate
      ? `You've shown a consistent pattern: when something shifts, you adapt quickly rather than holding the old position.`
      : null;

  const summary = [para1, para2, para3].filter(Boolean).join("\n\n");

  // Core traits: 2–5 word timeless labels
  const observations: string[] = [
    difficultTheme ? `Sits with ${difficultTheme.toLowerCase()}` : "Acts before certainty",
    `Drawn toward ${futureLabel}`,
    "Learns through action",
    recentUpdate ? "Adapts when things shift" : "Trusts own judgment",
  ];

  // Recent growth: 3–6 word present-tense movement phrases
  const recent_growth = [
    `Trusting ${primaryTheme} more`,
    secondaryLabel
      ? `Weighing ${futureLabel} against ${secondaryLabel}`
      : `Committing more fully to ${futureLabel}`,
    difficultTheme
      ? `Sitting with ${difficultTheme.toLowerCase()} longer`
      : "Deciding with less deliberation",
  ];

  return {
    title,
    summary,
    themes,
    observations,
    recent_growth,
  };
}
