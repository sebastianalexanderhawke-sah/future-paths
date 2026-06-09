import {
  generateMockLifeChapters,
  type TimelineGenerationInput,
} from "@/lib/mock-timeline-generator";
import { createClient } from "@/lib/supabase/server";
import type {
  LifeChapter,
  LifeChapterEvidence,
} from "@/types/database";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated." };
  }

  return { userId: user.id };
}

async function loadChapterInput(userId: string): Promise<
  TimelineGenerationInput | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const { data: moments, error: momentsError } = await supabase
    .from("moments")
    .select("id, title, created_at, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (momentsError) {
    return { error: momentsError.message };
  }

  const { data: chosenPaths, error: pathsError } = await supabase
    .from("paths")
    .select("id, moment_id, description, themes, chosen_at, created_at")
    .eq("user_id", userId)
    .eq("is_chosen", true);

  if (pathsError) {
    return { error: pathsError.message };
  }

  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("id, reflection, theme_changes, identity_impact, created_at")
    .eq("user_id", userId);

  if (checkInsError) {
    return { error: checkInsError.message };
  }

  const { data: identityUpdates, error: updatesError } = await supabase
    .from("identity_updates")
    .select("id, title, summary, themes, created_at")
    .eq("user_id", userId);

  if (updatesError) {
    return { error: updatesError.message };
  }

  const { data: futureSelves, error: futuresError } = await supabase
    .from("future_selves")
    .select("id, name, momentum, themes, status, updated_at")
    .eq("user_id", userId)
    .eq("status", "active");

  if (futuresError) {
    return { error: futuresError.message };
  }

  const { data: contradictions, error: contradictionsError } = await supabase
    .from("contradictions")
    .select("id, title, themes, intensity, status, updated_at")
    .eq("user_id", userId)
    .in("status", ["active", "softened"]);

  if (contradictionsError) {
    return { error: contradictionsError.message };
  }

  const { data: alternateSelves, error: alternateSelvesError } = await supabase
    .from("alternate_selves")
    .select("id, name, themes, status, updated_at, past_crossroad_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (alternateSelvesError) {
    return { error: alternateSelvesError.message };
  }

  const crossroadIds = [...new Set((alternateSelves ?? []).map((row) => row.past_crossroad_id))];
  const crossroadSnippets = new Map<string, string>();

  if (crossroadIds.length > 0) {
    const { data: crossroads, error: crossroadsError } = await supabase
      .from("past_crossroads")
      .select("id, what_happened")
      .eq("user_id", userId)
      .in("id", crossroadIds);

    if (crossroadsError) {
      return { error: crossroadsError.message };
    }

    for (const crossroad of crossroads ?? []) {
      const snippet = crossroad.what_happened.trim();
      crossroadSnippets.set(
        crossroad.id,
        snippet.length > 80 ? `${snippet.slice(0, 79).trim()}…` : snippet,
      );
    }
  }

  const { data: currentSelf, error: currentSelfError } = await supabase
    .from("current_self")
    .select("headline, summary, themes")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentSelfError) {
    return { error: currentSelfError.message };
  }

  return {
    moments: moments ?? [],
    chosenPaths: chosenPaths ?? [],
    checkIns: checkIns ?? [],
    identityUpdates: identityUpdates ?? [],
    futureSelves: futureSelves ?? [],
    contradictions: contradictions ?? [],
    alternateSelves: alternateSelves ?? [],
    crossroadSnippets,
    currentSelf: currentSelf ?? null,
  };
}

export async function listLifeChapters(
  limit?: number,
): Promise<{ chapters: LifeChapter[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  let query = supabase
    .from("life_chapters")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("sort_order", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { chapters: data ?? [] };
}

export async function getLifeChapter(
  chapterId: string,
): Promise<
  | { chapter: LifeChapter; evidence: LifeChapterEvidence[] }
  | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data: chapter, error: chapterError } = await supabase
    .from("life_chapters")
    .select("*")
    .eq("id", chapterId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (chapterError) {
    return { error: chapterError.message };
  }

  if (!chapter) {
    return { error: "Life chapter not found." };
  }

  const { data: evidence, error: evidenceError } = await supabase
    .from("life_chapter_evidence")
    .select("*")
    .eq("life_chapter_id", chapterId)
    .eq("user_id", auth.userId)
    .order("sort_order", { ascending: true });

  if (evidenceError) {
    return { error: evidenceError.message };
  }

  return { chapter, evidence: evidence ?? [] };
}

export async function generateTimeline(): Promise<
  { chapters: LifeChapter[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const input = await loadChapterInput(auth.userId);
  if ("error" in input) {
    return input;
  }

  const drafts = generateMockLifeChapters(input);
  if (drafts.length === 0) {
    return {
      error:
        "Not enough meaningful identity signal to form life chapters yet. Capture moments, check in, and reflect first.",
    };
  }

  const supabase = await createClient();

  const { data: existingChapters, error: existingError } = await supabase
    .from("life_chapters")
    .select("id")
    .eq("user_id", auth.userId);

  if (existingError) {
    return { error: existingError.message };
  }

  const existingIds = (existingChapters ?? []).map((chapter) => chapter.id);

  if (existingIds.length > 0) {
    const { error: deleteEvidenceError } = await supabase
      .from("life_chapter_evidence")
      .delete()
      .eq("user_id", auth.userId);

    if (deleteEvidenceError) {
      return { error: deleteEvidenceError.message };
    }

    const { error: deleteChaptersError } = await supabase
      .from("life_chapters")
      .delete()
      .eq("user_id", auth.userId);

    if (deleteChaptersError) {
      return { error: deleteChaptersError.message };
    }
  }

  const createdChapters: LifeChapter[] = [];

  for (const [index, draft] of drafts.entries()) {
    const { data: chapter, error: insertError } = await supabase
      .from("life_chapters")
      .insert({
        user_id: auth.userId,
        title: draft.title,
        period_label: draft.period_label,
        starts_at: draft.starts_at,
        ends_at: draft.ends_at,
        summary: draft.summary,
        themes: draft.themes,
        includes_current_self: draft.includes_current_self,
        sort_order: index,
      })
      .select("*")
      .single();

    if (insertError || !chapter) {
      return { error: insertError?.message ?? "Failed to create life chapter." };
    }

    if (draft.evidence.length > 0) {
      const { error: evidenceError } = await supabase.from("life_chapter_evidence").insert(
        draft.evidence.map((item, evidenceIndex) => ({
          life_chapter_id: chapter.id,
          user_id: auth.userId,
          evidence_type: item.evidence_type,
          evidence_id: item.evidence_id,
          label: item.label,
          occurred_at: item.occurred_at,
          sort_order: evidenceIndex,
        })),
      );

      if (evidenceError) {
        return { error: evidenceError.message };
      }
    }

    createdChapters.push(chapter);
  }

  return { chapters: createdChapters };
}
