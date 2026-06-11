import { z } from "zod";

import type { ContradictionSourceRefs } from "@/types/database";
import type { MockContradictionDraft } from "@/lib/mock-contradiction-generator";
import {
  contradictionTypeSchema,
  tentativeTextSchema,
  themesSchema,
} from "@/lib/ai/schemas/shared";
import { normalizeContradictionInOutput } from "@/lib/ai/schemas/theme-normalization";

const contradictionSourceRefsSchema = z.object({
  current_self_id: z.string().uuid().optional(),
  future_self_ids: z.array(z.string().uuid()).optional(),
  prompt_response_ids: z.array(z.string().uuid()).optional(),
}) satisfies z.ZodType<ContradictionSourceRefs>;

export const contradictionDraftSchema = z.object({
  contradiction_type: contradictionTypeSchema,
  title: tentativeTextSchema,
  summary: tentativeTextSchema,
  pole_a: tentativeTextSchema,
  pole_b: tentativeTextSchema,
  themes: themesSchema,
  intensity: z.number().int().min(0).max(100),
  source_refs: contradictionSourceRefsSchema,
  signature: z.string().min(1),
}) satisfies z.ZodType<MockContradictionDraft>;

export const contradictionOutputSchema = z.array(contradictionDraftSchema).max(3);

export function parseContradictionOutput(data: unknown): MockContradictionDraft[] {
  if (Array.isArray(data) && data.length === 0) {
    return [];
  }

  return contradictionOutputSchema.parse(normalizeContradictionInOutput(data));
}
