import { decodeNativePathFields } from "@/components/home/path-native-title";
import { toFirstSentence } from "@/components/home/output-refinement";
import { createClient } from "@/lib/supabase/server";
import {
  buildChapterStories,
  type ChapterStory,
} from "@/lib/timeline-chapter-story";
import type { ThemeChange } from "@/types/database";

/**
 * Read-only fetch behind the Timeline's chapter view. Loads the narrow
 * columns the story derivation needs (situations, check-ins, chosen paths)
 * and groups them into one ChapterStory per month label. Never writes,
 * never calls AI — a failed load degrades the chapter card to its
 * narrative-only sections rather than failing the page.
 */
export async function loadTimelineChapterStories(): Promise<
  { storiesByMonth: Map<string, ChapterStory> } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const [
    { data: momentRows, error: momentsError },
    { data: checkInRows, error: checkInsError },
    { data: pathRows, error: pathsError },
  ] = await Promise.all([
    supabase
      .from("moments")
      .select("id, title, description, current_understanding, created_at")
      .eq("user_id", user.id),
    supabase
      .from("check_ins")
      .select("moment_id, reality_summary, identity_impact, theme_changes, created_at")
      .eq("user_id", user.id),
    supabase
      .from("paths")
      .select("moment_id, description, chosen_at")
      .eq("user_id", user.id)
      .eq("is_chosen", true),
  ]);

  const error = momentsError ?? checkInsError ?? pathsError;
  if (error) {
    return { error: "Failed to load chapter stories." };
  }

  const storiesByMonth = buildChapterStories(
    (momentRows ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      currentUnderstanding: (row.current_understanding as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
    (checkInRows ?? []).map((row) => ({
      momentId: row.moment_id as string,
      realitySummary: (row.reality_summary as string) ?? "",
      identityImpact: (row.identity_impact as string) ?? "",
      themeChanges: (row.theme_changes as ThemeChange[]) ?? [],
      createdAt: row.created_at as string,
    })),
    (pathRows ?? []).flatMap((row) => {
      if (!row.chosen_at) return [];
      const { nativeTitle, description } = decodeNativePathFields(
        row.description as string,
      );
      return [
        {
          momentId: row.moment_id as string,
          title: nativeTitle ?? toFirstSentence(description),
          chosenAt: row.chosen_at as string,
        },
      ];
    }),
  );

  return { storiesByMonth };
}
