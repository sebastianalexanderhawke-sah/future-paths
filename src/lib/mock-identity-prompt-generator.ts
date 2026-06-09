import type {
  CheckIn,
  CurrentSelf,
  FutureSelf,
  IdentityUpdate,
} from "@/types/database";
import type { IdentityPromptType, ThemeName } from "@/types/enums";

export type MockIdentityPromptDraft = {
  prompt_type: IdentityPromptType;
  question: string;
  context: string | null;
  themes: ThemeName[];
};

function themeChangeWeight(change: {
  direction: "strengthened" | "emerging" | "weakened";
}): number {
  if (change.direction === "strengthened") {
    return 3;
  }

  if (change.direction === "emerging") {
    return 2;
  }

  return 1;
}

function aggregateExistingThemeSignals(input: {
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes">[];
}): ThemeName[] {
  const scores = new Map<ThemeName, number>();

  for (const theme of input.pathThemes) {
    scores.set(theme, (scores.get(theme) ?? 0) + 1);
  }

  for (const checkIn of input.checkIns) {
    for (const change of checkIn.theme_changes) {
      scores.set(
        change.theme,
        (scores.get(change.theme) ?? 0) + themeChangeWeight(change) * 3,
      );
    }
  }

  return [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);
}

function formatThemeList(themes: ThemeName[]): string {
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

export function generateMockIdentityPrompts(input: {
  momentCount: number;
  checkInCount: number;
  currentSelf: CurrentSelf | null;
  activeFutureSelves: FutureSelf[];
  identityUpdates: Pick<IdentityUpdate, "title" | "summary" | "themes">[];
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes">[];
}): MockIdentityPromptDraft[] {
  if (input.momentCount < 1 || input.checkInCount < 1) {
    return [];
  }

  const drafts: MockIdentityPromptDraft[] = [];
  const themeSignals =
    input.currentSelf && input.currentSelf.themes.length > 0
      ? input.currentSelf.themes
      : aggregateExistingThemeSignals({
          pathThemes: input.pathThemes,
          checkIns: input.checkIns,
        });
  const themePhrase = formatThemeList(themeSignals);

  if (themeSignals.length > 0) {
    const context = input.currentSelf
      ? `This may connect to your current self summary: "${input.currentSelf.headline}".`
      : `This may connect to themes appearing across your chosen paths and check-ins.`;

    drafts.push({
      prompt_type: "theme_reflection",
      question: `You may be expressing ${themePhrase.toLowerCase()} more often lately. When did you last notice that showing up in a real choice?`,
      context,
      themes: themeSignals,
    });
  }

  const sortedFutures = [...input.activeFutureSelves].sort(
    (a, b) => b.momentum - a.momentum,
  );
  const leadingFuture = sortedFutures[0];

  if (leadingFuture) {
    const currentSelfPhrase = input.currentSelf
      ? ` Your current self may already reflect this tension: "${input.currentSelf.headline.toLowerCase()}".`
      : "";

    drafts.push({
      prompt_type: "future_alignment",
      question: `${leadingFuture.name} may be pulling you forward. What small action this week might move you closer — or reveal that this future no longer fits?`,
      context: `${leadingFuture.description}${currentSelfPhrase}`,
      themes: leadingFuture.themes,
    });
  }

  const recentUpdate = input.identityUpdates[0];

  if (recentUpdate) {
    drafts.push({
      prompt_type: "pattern_probe",
      question: `Your recent shift — "${recentUpdate.title.toLowerCase()}" — may still be settling. What feels true about it now, and what still feels uncertain?`,
      context: recentUpdate.summary,
      themes: recentUpdate.themes,
    });
  }

  return drafts.slice(0, 3);
}
