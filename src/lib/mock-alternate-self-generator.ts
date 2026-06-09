import type { PastAlternativePath, PastCrossroad } from "@/types/database";
import type { ThemeName } from "@/types/enums";

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

function formatThemeList(themes: ThemeName[]): string {
  if (themes.length === 0) {
    return "exploration and growth";
  }

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
  crossroad: Pick<PastCrossroad, "what_happened" | "why_chosen" | "life_stage">;
  selectedPath: Pick<
    PastAlternativePath,
    "title" | "description" | "themes" | "possible_future_shift"
  >;
}): MockAlternateSelfDraft {
  const actualSnippet = truncate(input.crossroad.what_happened, 140);
  const alternativeTitle = input.selectedPath.title;
  const alternativeDescription = truncate(input.selectedPath.description, 160);
  const themes =
    input.selectedPath.themes.length > 0
      ? input.selectedPath.themes
      : (["Reflection", "Growth"] as ThemeName[]);
  const primaryTheme = themes[0];
  const name = IDENTITY_NAMES[primaryTheme];
  const themePhrase = formatThemeList(themes);
  const lifeStagePhrase = input.crossroad.life_stage
    ? ` At ${input.crossroad.life_stage.toLowerCase()},`
    : "";

  const road_not_taken = `${alternativeTitle} may have represented a different direction:${lifeStagePhrase} ${alternativeDescription} That path might have emphasized ${themePhrase} — a plausible alternative that existed at the time, not a better life you missed.`;

  const alternate_self = `${name} may have emerged along that road. ${input.selectedPath.possible_future_shift} Instead of ${actualSnippet.toLowerCase()}, you might have developed patterns shaped more by ${themePhrase}. This is a perspective on identity, not a judgment about the choice you made.`;

  const what_remains_available = `That version of you is not gone. Qualities this path might have cultivated — such as ${themePhrase} — may still be available today in small forms: curiosity, independence, creativity, connection, or leadership expressed in ways that fit the life you actually built. You may notice them in moments that echo ${alternativeTitle.toLowerCase()} without needing to rewrite your past.`;

  return {
    name,
    road_not_taken,
    alternate_self,
    what_remains_available,
    themes,
  };
}
