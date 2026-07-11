import { isCheckInThemeName } from "@/lib/check-in-themes";
import { createClient } from "@/lib/supabase/server";
import type { ThemeChange } from "@/types/database";

/**
 * Where the user's attention has been invested recently — the Pattern
 * Emerging card's "Your Focus" section. A pure read over existing data: the
 * theme names the product already records on check-ins (theme_changes) and
 * chosen paths (themes), tallied over a recent window. Reflections ride
 * along automatically (they live on check-in rows), and situations
 * contribute through the paths and check-ins they produced. No new
 * categories are invented: only the product's existing theme vocabulary can
 * appear, and only when the user's own entries carried it.
 */
export type FocusArea = {
  /** Theme name from the existing vocabulary (never invented). */
  theme: string;
  /** Relative attention, 0..1 against the strongest area (drives the bar). */
  weight: number;
  /** Raw mention count — kept for future monthly comparisons and a11y. */
  mentions: number;
  /** Destination for future clickable focus areas; unused by today's card. */
  href?: string;
};

/** The card shows at most this many areas — and never pads to reach it. */
export const FOCUS_AREA_LIMIT = 4;

/** How far back "recently" reaches. Wider than What's Changed's 7-day news
 *  window on purpose: attention is a season, movement is news. */
export const FOCUS_WINDOW_DAYS = 30;

/**
 * The pure aggregation: lists of theme mentions in, ranked focus areas out.
 * Ties break alphabetically so the render order is stable between visits.
 */
export function tallyFocusAreas(themeMentions: string[]): FocusArea[] {
  const counts = new Map<string, number>();
  for (const theme of themeMentions) {
    if (!isCheckInThemeName(theme)) continue;
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
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
