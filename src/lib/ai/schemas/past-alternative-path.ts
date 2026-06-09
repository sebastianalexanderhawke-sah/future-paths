import { z } from "zod";

import type { MockPastAlternativePathDraft } from "@/lib/mock-past-alternative-path-generator";
import { tentativeTextSchema, themesSchema } from "@/lib/ai/schemas/shared";

export const pastAlternativePathDraftSchema = z.object({
  title: tentativeTextSchema,
  description: tentativeTextSchema,
  themes: themesSchema,
  possible_future_shift: tentativeTextSchema,
}) satisfies z.ZodType<MockPastAlternativePathDraft>;

export const pastAlternativePathOutputSchema = z
  .array(pastAlternativePathDraftSchema)
  .min(3)
  .max(5);

export function parsePastAlternativePathOutput(
  data: unknown,
): MockPastAlternativePathDraft[] {
  return pastAlternativePathOutputSchema.parse(data);
}
