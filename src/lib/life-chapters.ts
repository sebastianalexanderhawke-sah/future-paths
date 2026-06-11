import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { timelineDiscoverOutputSchema } from "@/lib/ai/schemas/timeline";
import { createClient } from "@/lib/supabase/server";
import type {
  LifeChapter,
  LifeChapterEvidence,
} from "@/types/database";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

const INSUFFICIENT_SIGNAL_ERROR =
  "Not enough meaningful identity signal to form life chapters yet. Capture moments, check in, and reflect first.";

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

export async function deleteUserTimeline(): Promise<{ ok: true } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();

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

  return { ok: true };
}

export async function generateTimeline(): Promise<
  { chapters: LifeChapter[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const generationResult = await runStructuredGeneration({
    userId: auth.userId,
    profile: "timeline",
    promptId: "timeline.generate",
    schema: timelineDiscoverOutputSchema,
  });

  if (!generationResult.ok) {
    return { error: generationResult.error };
  }

  const drafts = generationResult.data;
  if (drafts.length === 0) {
    return {
      error: INSUFFICIENT_SIGNAL_ERROR,
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
