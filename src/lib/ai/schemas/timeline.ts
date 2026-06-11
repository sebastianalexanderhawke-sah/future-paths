import { z } from "zod";

import type {
  ChapterEvidenceDraft,
  MockLifeChapterDraft,
} from "@/lib/mock-timeline-generator";
import {
  lifeChapterEvidenceTypeSchema,
  tentativeTextSchema,
  themesSchema,
} from "@/lib/ai/schemas/shared";
import { normalizeTimelineInOutput } from "@/lib/ai/schemas/theme-normalization";

export const chapterEvidenceDraftSchema = z.object({
  evidence_type: lifeChapterEvidenceTypeSchema,
  evidence_id: z.string().uuid(),
  label: tentativeTextSchema,
  occurred_at: z.string().min(1),
  sort_priority: z.number().int().min(0).max(100),
}) satisfies z.ZodType<ChapterEvidenceDraft>;

export const lifeChapterDraftSchema = z.object({
  title: tentativeTextSchema,
  period_label: tentativeTextSchema,
  starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: tentativeTextSchema,
  themes: themesSchema,
  includes_current_self: z.boolean(),
  evidence: z.array(chapterEvidenceDraftSchema).max(8),
  strength: z.number().min(0),
}) satisfies z.ZodType<MockLifeChapterDraft>;

export const timelineOutputSchema = z.array(lifeChapterDraftSchema).max(8);

export const timelineDiscoverOutputSchema = z
  .array(lifeChapterDraftSchema)
  .max(8) satisfies z.ZodType<MockLifeChapterDraft[]>;

export function parseTimelineOutput(data: unknown): MockLifeChapterDraft[] {
  if (Array.isArray(data) && data.length === 0) {
    return [];
  }

  return timelineOutputSchema.parse(normalizeTimelineInOutput(data));
}
