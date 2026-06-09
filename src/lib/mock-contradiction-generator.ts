import type {
  ContradictionSourceRefs,
  CurrentSelf,
  FutureSelf,
  IdentityPrompt,
  IdentityPromptResponse,
} from "@/types/database";
import type { ContradictionType, ThemeName } from "@/types/enums";

export type AnsweredPromptResponse = {
  prompt: Pick<IdentityPrompt, "id" | "prompt_type" | "question" | "themes">;
  response: Pick<IdentityPromptResponse, "id" | "response" | "themes">;
};

export type MockContradictionDraft = {
  contradiction_type: ContradictionType;
  title: string;
  summary: string;
  pole_a: string;
  pole_b: string;
  themes: ThemeName[];
  intensity: number;
  source_refs: ContradictionSourceRefs;
  signature: string;
};

const UNCERTAINTY_PHRASES = [
  "no longer",
  "doesn't fit",
  "does not fit",
  "uncertain",
  "not sure",
  "pulling away",
  "pull away",
];

function themeOverlap(themesA: ThemeName[], themesB: ThemeName[]): number {
  const setB = new Set(themesB);
  return themesA.filter((theme) => setB.has(theme)).length;
}

function mergeThemes(...groups: ThemeName[][]): ThemeName[] {
  return [...new Set(groups.flat())].slice(0, 3);
}

function computeIntensity(disjointThemeCount: number, momentum = 0): number {
  return Math.min(100, 40 + disjointThemeCount * 15 + Math.round(momentum / 25));
}

function formatThemeList(themes: ThemeName[]): string {
  if (themes.length === 0) {
    return "different patterns";
  }

  if (themes.length === 1) {
    return themes[0];
  }

  return `${themes[0]} and ${themes[1]}`;
}

function hasUncertaintyLanguage(response: string): boolean {
  const normalized = response.toLowerCase();
  return UNCERTAINTY_PHRASES.some((phrase) => normalized.includes(phrase));
}

function buildCurrentVsFutureDraft(input: {
  currentSelf: CurrentSelf;
  leadingFuture: FutureSelf;
}): MockContradictionDraft | null {
  const overlap = themeOverlap(input.currentSelf.themes, input.leadingFuture.themes);

  if (overlap > 0 || input.leadingFuture.themes.length === 0) {
    return null;
  }

  const currentThemes = formatThemeList(input.currentSelf.themes);
  const futureThemes = formatThemeList(input.leadingFuture.themes);
  const disjointCount = Math.max(
    input.currentSelf.themes.length,
    input.leadingFuture.themes.length,
  );

  return {
    contradiction_type: "current_vs_future",
    title: "Today and tomorrow may be pulling in different directions",
    summary: `You currently tend toward ${currentThemes.toLowerCase()}, while ${input.leadingFuture.name} may be drawing you toward ${futureThemes.toLowerCase()}. This tension may show up when your present patterns and your emerging future both feel plausible.`,
    pole_a: input.currentSelf.headline,
    pole_b: `${input.leadingFuture.name} — ${input.leadingFuture.description}`,
    themes: mergeThemes(input.currentSelf.themes, input.leadingFuture.themes),
    intensity: computeIntensity(disjointCount, input.leadingFuture.momentum),
    source_refs: {
      current_self_id: input.currentSelf.id,
      future_self_ids: [input.leadingFuture.id],
    },
    signature: `current_vs_future:${input.leadingFuture.id}`,
  };
}

function buildDualFutureDraft(input: {
  firstFuture: FutureSelf;
  secondFuture: FutureSelf;
}): MockContradictionDraft | null {
  if (
    input.firstFuture.momentum < 25 ||
    input.secondFuture.momentum < 25 ||
    themeOverlap(input.firstFuture.themes, input.secondFuture.themes) > 0
  ) {
    return null;
  }

  const firstThemes = formatThemeList(input.firstFuture.themes);
  const secondThemes = formatThemeList(input.secondFuture.themes);

  return {
    contradiction_type: "dual_future",
    title: "Two futures may both be asking for your attention",
    summary: `${input.firstFuture.name} and ${input.secondFuture.name} may both be active at once, emphasizing ${firstThemes.toLowerCase()} and ${secondThemes.toLowerCase()} respectively. You may feel pulled between these trajectories without either being wrong.`,
    pole_a: `${input.firstFuture.name} (${firstThemes})`,
    pole_b: `${input.secondFuture.name} (${secondThemes})`,
    themes: mergeThemes(input.firstFuture.themes, input.secondFuture.themes),
    intensity: computeIntensity(
      input.firstFuture.themes.length + input.secondFuture.themes.length,
      Math.max(input.firstFuture.momentum, input.secondFuture.momentum),
    ),
    source_refs: {
      future_self_ids: [input.firstFuture.id, input.secondFuture.id],
    },
    signature: `dual_future:${[input.firstFuture.id, input.secondFuture.id].sort().join(":")}`,
  };
}

function buildStatedVsLivedDraft(input: {
  currentSelf: CurrentSelf;
  answeredResponse: AnsweredPromptResponse;
}): MockContradictionDraft | null {
  const responseThemes = input.answeredResponse.response.themes;
  const overlap = themeOverlap(input.currentSelf.themes, responseThemes);
  const uncertain = hasUncertaintyLanguage(input.answeredResponse.response.response);

  if (overlap > 0 && !uncertain) {
    return null;
  }

  const livedThemes = formatThemeList(input.currentSelf.themes);
  const statedThemes =
    responseThemes.length > 0
      ? formatThemeList(responseThemes)
      : "what you recently reflected";

  return {
    contradiction_type: "stated_vs_lived",
    title: "What you said and what patterns suggest may diverge",
    summary: `Your current self may emphasize ${livedThemes.toLowerCase()}, while your recent reflection may point toward ${statedThemes.toLowerCase()}. This may be a useful tension to sit with rather than resolve quickly.`,
    pole_a: input.currentSelf.headline,
    pole_b: input.answeredResponse.response.response.slice(0, 180),
    themes: mergeThemes(input.currentSelf.themes, responseThemes),
    intensity: computeIntensity(
      Math.max(1, input.currentSelf.themes.length - overlap),
      uncertain ? 20 : 0,
    ),
    source_refs: {
      current_self_id: input.currentSelf.id,
      prompt_response_ids: [input.answeredResponse.response.id],
    },
    signature: `stated_vs_lived:${input.answeredResponse.response.id}`,
  };
}

export function generateMockContradictions(input: {
  currentSelf: CurrentSelf | null;
  activeFutureSelves: FutureSelf[];
  answeredResponses: AnsweredPromptResponse[];
}): MockContradictionDraft[] {
  if (!input.currentSelf) {
    return [];
  }

  const drafts: MockContradictionDraft[] = [];
  const sortedFutures = [...input.activeFutureSelves]
    .filter((future) => future.status === "active")
    .sort((a, b) => b.momentum - a.momentum);
  const leadingFuture = sortedFutures[0];
  const secondFuture = sortedFutures[1];

  if (leadingFuture) {
    const currentVsFuture = buildCurrentVsFutureDraft({
      currentSelf: input.currentSelf,
      leadingFuture,
    });

    if (currentVsFuture) {
      drafts.push(currentVsFuture);
    }
  }

  if (leadingFuture && secondFuture) {
    const dualFuture = buildDualFutureDraft({
      firstFuture: leadingFuture,
      secondFuture,
    });

    if (dualFuture) {
      drafts.push(dualFuture);
    }
  }

  for (const answeredResponse of input.answeredResponses) {
    if (drafts.length >= 3) {
      break;
    }

    const statedVsLived = buildStatedVsLivedDraft({
      currentSelf: input.currentSelf,
      answeredResponse,
    });

    if (
      statedVsLived &&
      !drafts.some((draft) => draft.signature === statedVsLived.signature)
    ) {
      drafts.push(statedVsLived);
    }
  }

  return drafts.slice(0, 3);
}
