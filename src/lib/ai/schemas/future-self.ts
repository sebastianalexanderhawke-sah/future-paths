import { z } from "zod";

import {
  FUTURE_SELF_MOVEMENT_DIRECTIONS,
  type MockFutureSelfDraft,
} from "@/lib/mock-future-self-generator";
import {
  benefitsConsequencesListSchema,
  futureSelfEvidenceStrengthSchema,
  tentativeTextSchema,
  themesSchema,
} from "@/lib/ai/schemas/shared";
import { normalizeFutureSelfInOutput } from "@/lib/ai/schemas/theme-normalization";

export const futureSelfMovementDirectionSchema = z.enum(FUTURE_SELF_MOVEMENT_DIRECTIONS);

// Empty string is valid (and expected) when movement_direction is "unchanged"
// — there is nothing to explain — so this skips tentativeTextSchema's min(1).
export const futureSelfWhyChangedSchema = z.string().trim().max(400);

export const futureSelfDraftSchema = z.object({
  name: tentativeTextSchema,
  summary: tentativeTextSchema,
  movement_direction: futureSelfMovementDirectionSchema,
  evidence_strength: futureSelfEvidenceStrengthSchema,
  benefits: benefitsConsequencesListSchema,
  consequences: benefitsConsequencesListSchema,
  prediction: tentativeTextSchema,
  themes: themesSchema,
  why_changed: futureSelfWhyChangedSchema,
}) satisfies z.ZodType<MockFutureSelfDraft>;

export const futureSelfOutputSchema = z.array(futureSelfDraftSchema).min(1).max(5);

export const futureSelfDiscoverOutputSchema = z
  .array(futureSelfDraftSchema)
  .max(5) satisfies z.ZodType<MockFutureSelfDraft[]>;

export function parseFutureSelfOutput(data: unknown): MockFutureSelfDraft[] {
  if (Array.isArray(data) && data.length === 0) {
    return [];
  }

  return futureSelfOutputSchema.parse(normalizeFutureSelfInOutput(data));
}
