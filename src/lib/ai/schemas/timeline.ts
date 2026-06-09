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

export function parseTimelineOutput(data: unknown): MockLifeChapterDraft[] {
  return timelineOutputSchema.parse(data);
}
