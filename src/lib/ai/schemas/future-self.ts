import { z } from "zod";

import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import {
  benefitsConsequencesListSchema,
  futureSelfEvidenceStrengthSchema,
  tentativeTextSchema,
  themesSchema,
} from "@/lib/ai/schemas/shared";
import { normalizeFutureSelfInOutput } from "@/lib/ai/schemas/theme-normalization";

export const futureSelfDraftSchema = z.object({
  name: tentativeTextSchema,
  summary: tentativeTextSchema,
  percentage: z.number().int().min(1).max(100),
  evidence_strength: futureSelfEvidenceStrengthSchema,
  benefits: benefitsConsequencesListSchema,
  consequences: benefitsConsequencesListSchema,
  prediction: tentativeTextSchema,
  themes: themesSchema,
}) satisfies z.ZodType<MockFutureSelfDraft>;

function refinePercentagesSumTo100(
  drafts: MockFutureSelfDraft[],
  ctx: z.RefinementCtx,
) {
  if (drafts.length === 0) {
    return;
  }

  const total = drafts.reduce((sum, draft) => sum + draft.percentage, 0);

  if (total !== 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Future self percentages must sum to 100 (got ${total}).`,
      path: ["percentage"],
    });
  }
}

export const futureSelfOutputSchema = z
  .array(futureSelfDraftSchema)
  .min(1)
  .max(4)
  .superRefine(refinePercentagesSumTo100);

export const futureSelfDiscoverOutputSchema = z
  .array(futureSelfDraftSchema)
  .max(4)
  .superRefine(refinePercentagesSumTo100) satisfies z.ZodType<MockFutureSelfDraft[]>;

export function parseFutureSelfOutput(data: unknown): MockFutureSelfDraft[] {
  if (Array.isArray(data) && data.length === 0) {
    return [];
  }

  return futureSelfOutputSchema.parse(normalizeFutureSelfInOutput(data));
}
