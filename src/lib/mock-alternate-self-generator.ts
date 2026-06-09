import type { ThemeName } from "@/types/enums";
import { THEME_NAMES } from "@/types/enums";

export type MockAlternateSelfDraft = {
  name: string;
  road_not_taken: string;
  alternate_self: string;
  what_remains_available: string;
  themes: ThemeName[];
};

const IDENTITY_NAMES: Record<ThemeName, string> = {
  Connection: "The Connector",
  Independence: "The Independent",
  Curiosity: "The Explorer",
  Stability: "The Anchor",
  Creativity: "The Creator",
  Growth: "The Learner",
  Belonging: "The Builder of Belonging",
  Leadership: "The Leader",
  Reflection: "The Reflective",
  Courage: "The Pioneer",
};

const THEME_KEYWORDS: Record<ThemeName, string[]> = {
  Connection: ["connect", "relationship", "community", "together", "family", "friend"],
  Independence: ["independ", "alone", "solo", "freedom", "own", "self-reliant"],
  Curiosity: ["curious", "explore", "learn", "discover", "question", "travel"],
  Stability: ["stable", "steady", "safe", "security", "stay", "root"],
  Creativity: ["creat", "art", "design", "write", "build", "make"],
  Growth: ["grow", "develop", "improve", "expand", "progress", "evolve"],
  Belonging: ["belong", "home", "tribe", "group", "fit in", "community"],
  Leadership: ["lead", "manage", "guide", "direct", "influence", "mentor"],
  Reflection: ["reflect", "think", "consider", "pause", "contemplate", "weigh"],
  Courage: ["courage", "brave", "risk", "leap", "bold", "move"],
};

function inferThemes(text: string): ThemeName[] {
  const normalized = text.toLowerCase();
  const scores = new Map<ThemeName, number>();

  for (const theme of THEME_NAMES) {
    for (const keyword of THEME_KEYWORDS[theme]) {
      if (normalized.includes(keyword)) {
        scores.set(theme, (scores.get(theme) ?? 0) + 1);
      }
    }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);

  if (ranked.length > 0) {
    return ranked.slice(0, 2);
  }

  return ["Reflection", "Growth"];
}

function formatThemeList(themes: ThemeName[]): string {
  if (themes.length === 1) {
    return themes[0].toLowerCase();
  }

  return `${themes[0].toLowerCase()} and ${themes[1].toLowerCase()}`;
}

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

export function generateMockAlternateSelf(input: {
  decisionTitle: string;
  chosenPath: string;
  unchosenPath: string;
}): MockAlternateSelfDraft {
  const decision = input.decisionTitle.trim();
  const chosen = input.chosenPath.trim();
  const unchosen = input.unchosenPath.trim();
  const themes = inferThemes(`${unchosen} ${decision}`);
  const primaryTheme = themes[0];
  const name = IDENTITY_NAMES[primaryTheme];
  const themePhrase = formatThemeList(themes);
  const chosenSnippet = truncate(chosen, 120);
  const unchosenSnippet = truncate(unchosen, 120);

  const road_not_taken = `When you faced "${decision}", another direction may have been open: ${unchosenSnippet}. That path might have emphasized ${themePhrase} — a different way of moving through the same crossroad, without undoing what you actually chose.`;

  const alternate_self = `${name} may have emerged along that road — someone shaped more by ${themePhrase} than the path you took. Instead of ${chosenSnippet.toLowerCase()}, you might have developed patterns that leaned toward ${themePhrase}. This is a perspective, not a verdict on the life you lived.`;

  const what_remains_available = `Part of what "${unchosenSnippet.toLowerCase()}" might have opened may still be reachable today — not as a do-over, but as a thread you can notice. Themes like ${themePhrase} may appear in small choices, curiosities, or moments that echo that road not taken, without requiring you to rewrite the past.`;

  return {
    name,
    road_not_taken,
    alternate_self,
    what_remains_available,
    themes,
  };
}
