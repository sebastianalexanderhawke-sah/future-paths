import type { ThemeChange } from "@/types/database";
import type { FutureSelfStage, ThemeName } from "@/types/enums";

export type MockFutureSelfDraft = {
  name: string;
  description: string;
  stage: FutureSelfStage;
  momentum: number;
  themes: ThemeName[];
};

const THEME_ARCHETYPE: Record<ThemeName, string> = {
  Connection: "The Connector",
  Belonging: "The Connector",
  Courage: "The Pioneer",
  Growth: "The Builder",
  Curiosity: "The Explorer",
  Independence: "The Explorer",
  Creativity: "The Creator",
  Reflection: "The Creator",
  Stability: "The Guardian",
  Leadership: "The Mentor",
};

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  "The Connector":
    "You may be becoming someone who builds belonging and deepens relationships across your choices.",
  "The Pioneer":
    "You may be becoming someone who moves toward uncertainty with courage and opens new paths.",
  "The Builder":
    "You may be becoming someone who grows steadily, shaping long-term direction through deliberate effort.",
  "The Explorer":
    "You may be becoming someone who follows curiosity and carves out more independent ways of living.",
  "The Creator":
    "You may be becoming someone who expresses identity through reflection and creative possibility.",
  "The Guardian":
    "You may be becoming someone who values stability and protects what matters across your decisions.",
  "The Mentor":
    "You may be becoming someone who steps into leadership and helps others find their way forward.",
};

function computeStage(
  momentCount: number,
  checkInCount: number,
): FutureSelfStage {
  if (momentCount >= 10 && checkInCount >= 3) {
    return "future_self";
  }

  if (momentCount >= 5) {
    return "emerging";
  }

  return "possible";
}

function themeChangeWeight(change: ThemeChange): number {
  if (change.direction === "strengthened") {
    return 3;
  }

  if (change.direction === "emerging") {
    return 2;
  }

  return 1;
}

export function generateMockFutureSelves(input: {
  momentCount: number;
  checkInCount: number;
  pathThemes: ThemeName[];
  checkInThemeChanges: ThemeChange[];
  identityUpdateThemes: ThemeName[];
}): MockFutureSelfDraft[] {
  if (input.momentCount < 1) {
    return [];
  }

  const themeScores = new Map<ThemeName, number>();

  for (const theme of input.pathThemes) {
    themeScores.set(theme, (themeScores.get(theme) ?? 0) + 1);
  }

  for (const change of input.checkInThemeChanges) {
    themeScores.set(
      change.theme,
      (themeScores.get(change.theme) ?? 0) + themeChangeWeight(change) * 3,
    );
  }

  for (const theme of input.identityUpdateThemes) {
    themeScores.set(theme, (themeScores.get(theme) ?? 0) + 2);
  }

  const archetypeScores = new Map<
    string,
    { score: number; themes: ThemeName[] }
  >();

  for (const [theme, score] of themeScores) {
    if (score <= 0) {
      continue;
    }

    const name = THEME_ARCHETYPE[theme];
    const existing = archetypeScores.get(name) ?? { score: 0, themes: [] };

    existing.score += score;
    if (!existing.themes.includes(theme)) {
      existing.themes.push(theme);
    }

    archetypeScores.set(name, existing);
  }

  const ranked = [...archetypeScores.entries()]
    .filter(([, entry]) => entry.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return [];
  }

  const stage = computeStage(input.momentCount, input.checkInCount);
  const topScore = ranked[0][1].score;

  return ranked.map(([name, entry]) => ({
    name,
    description: ARCHETYPE_DESCRIPTIONS[name],
    stage,
    momentum: Math.min(100, Math.max(10, Math.round((entry.score / topScore) * 100))),
    themes: entry.themes.slice(0, 2),
  }));
}
