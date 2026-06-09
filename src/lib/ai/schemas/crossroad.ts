import { z } from "zod";

import type { MockCrossroadResult, MockPathDraft } from "@/lib/mock-crossroad-generator";
import { tentativeTextSchema, themeNameSchema, themesSchema } from "@/lib/ai/schemas/shared";

export const pathDraftSchema = z.object({
  description: tentativeTextSchema,
  benefits: z.array(tentativeTextSchema).min(2).max(4),
  consequences: z.array(tentativeTextSchema).min(2).max(4),
  future_shift: tentativeTextSchema,
  themes: themesSchema,
}) satisfies z.ZodType<MockPathDraft>;

export const crossroadOutputSchema = z.object({
  current_understanding: tentativeTextSchema,
  paths: z.array(pathDraftSchema).length(5),
}) satisfies z.ZodType<MockCrossroadResult>;

export function parseCrossroadOutput(data: unknown): MockCrossroadResult {
  return crossroadOutputSchema.parse(data);
}
