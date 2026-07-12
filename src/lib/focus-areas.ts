import { isCheckInThemeName } from "@/lib/check-in-themes";
import { createClient } from "@/lib/supabase/server";
import type { ThemeChange } from "@/types/database";
import type { CheckInThemeName } from "@/types/enums";

/**
 * Where the user's attention has been invested recently — the Your Focus
 * section. A pure read over existing data: the theme names the product
 * already records on check-ins (theme_changes) and chosen paths (themes),
 * tallied over a recent window. Reflections ride along automatically (they
 * live on check-in rows), and situations contribute through the paths and
 * check-ins they produced.
 *
 * Overview Phase 4: the card speaks in real LIFE AREAS (Career,
 * Relationships, …) instead of the internal theme vocabulary. Each theme
 * mention is mapped onto its life area before counting — a fixed editorial
 * mapping, not a new classifier — so an area appears only when the user's
 * own entries carried themes that belong to it, and is never padded.
 */
export type FocusArea = {
  /** Life area name (LIFE_AREAS) the attention landed in. */
  theme: string;
  /** Relative attention, 0..1 against the strongest area (drives the bar). */
  weight: number;
  /** Raw mention count — kept for future monthly comparisons and a11y. */
  mentions: number;
  /** Destination for future clickable focus areas; unused by today's card. */
  href?: string;
};

/** The real-life vocabulary the Your Focus section speaks. */
export const LIFE_AREAS = [
  "Career",
  "Relationships",
  "Family",
  "Health",
  "Education",
  "Finances",
  "Personal Growth",
] as const;
export type LifeArea = (typeof LIFE_AREAS)[number];

// Fixed editorial mapping from the recorded theme vocabulary onto life
// areas. Every recorded theme maps somewhere (attention is attention —
// difficult themes included); an area with no mapped themes in the window
// simply never appears.
const THEME_TO_LIFE_AREA: Record<CheckInThemeName, LifeArea> = {
  Courage: "Personal Growth",
  Connection: "Relationships",
  Stability: "Finances",
  Independence: "Career",
  Reflection: "Personal Growth",
  Growth: "Personal Growth",
  Belonging: "Relationships",
  Curiosity: "Education",
  Leadership: "Career",
  Creativity: "Personal Growth",
  Loneliness: "Relationships",
  Disappointment: "Personal Growth",
  Grief: "Family",
  Frustration: "Career",
  Uncertainty: "Personal Growth",
  Hurt: "Relationships",
  Acceptance: "Personal Growth",
  Resilience: "Health",
};

/** The card shows at most this many areas — and never pads to reach it. */
export const FOCUS_AREA_LIMIT = 4;

/** How far back "recently" reaches. Wider than What's Changed's 7-day news
 *  window on purpose: attention is a season, movement is news. */
export const FOCUS_WINDOW_DAYS = 30;

/**
 * The pure aggregation: lists of theme mentions in, ranked life-area focus
 * out. Each mention lands in its mapped life area; unknown strings are
 * ignored. Ties break alphabetically so the render order is stable between
 * visits.
 */
export function tallyFocusAreas(themeMentions: string[]): FocusArea[] {
  const counts = new Map<string, number>();
  for (const theme of themeMentions) {
    if (!isCheckInThemeName(theme)) continue;
    const area = THEME_TO_LIFE_AREA[theme];
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .sort(([themeA, countA], [themeB, countB]) =>
      countB !== countA ? countB - countA : themeA.localeCompare(themeB),
    )
    .slice(0, FOCUS_AREA_LIMIT);

  const max = ranked[0]?.[1] ?? 0;
  return ranked.map(([theme, mentions]) => ({
    theme,
    mentions,
    weight: max > 0 ? mentions / max : 0,
  }));
}

/**
 * One-sentence insight for the Your Focus card, summarizing where the
 * user's attention has been. Composed deterministically from the same
 * tallied focus areas that drive the bars — the Overview is the landing
 * page and renders on every visit, so this sentence must not cost an AI
 * call (latency + daily quota) or a cache table. The sentence shapes
 * cover the real distributions: single focus, dominant leader, even
 * split, and leader-with-background.
 */
export function buildFocusInsight(areas: FocusArea[]): string | null {
  const [first, second, third] = areas;
  if (!first) return null;

  if (!second) {
    return `Nearly all of your recent attention has gone to ${first.theme}.`;
  }

  if (second.weight <= 0.5) {
    return `${first.theme} has been pulling most of your attention lately, well ahead of ${second.theme}.`;
  }

  if (!third) {
    return `Your attention has been split mainly between ${first.theme} and ${second.theme}.`;
  }

  if (third.weight >= 0.6) {
    return `Your attention has been spread fairly evenly across ${first.theme}, ${second.theme}, and ${third.theme}.`;
  }

  return `${first.theme} and ${second.theme} have been leading your attention, with ${third.theme} in the background.`;
}

export async function getRecentFocusAreas(): Promise<FocusArea[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const cutoff = new Date(
    Date.now() - FOCUS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [checkIns, chosenPaths] = await Promise.all([
    supabase
      .from("check_ins")
      .select("theme_changes")
      .eq("user_id", user.id)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("paths")
      .select("themes")
      .eq("user_id", user.id)
      .eq("is_chosen", true)
      .gte("chosen_at", cutoff)
      .limit(30),
  ]);

  const mentions: string[] = [];

  for (const row of checkIns.data ?? []) {
    const changes = (row.theme_changes ?? []) as ThemeChange[];
    for (const change of changes) {
      if (typeof change?.theme === "string") mentions.push(change.theme);
    }
  }

  for (const row of chosenPaths.data ?? []) {
    const themes = (row.themes ?? []) as unknown[];
    for (const theme of themes) {
      if (typeof theme === "string") mentions.push(theme);
    }
  }

  return tallyFocusAreas(mentions);
}
