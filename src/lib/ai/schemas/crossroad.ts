import { z } from "zod";

import type { MockCrossroadResult, MockPathDraft } from "@/lib/mock-crossroad-generator";
import { normalizeCrossroadThemesInOutput } from "@/lib/ai/schemas/theme-normalization";
import { tentativeTextSchema, themeNameSchema, themesSchema } from "@/lib/ai/schemas/shared";

export const pathDraftSchema = z.object({
  title: z.string().trim().max(80).default(""),
  description: tentativeTextSchema,
  benefits: z.array(tentativeTextSchema).min(2).max(4),
  consequences: z.array(tentativeTextSchema).min(2).max(4),
  future_shift: tentativeTextSchema,
  themes: themesSchema,
});

export const crossroadOutputSchema = z.object({
  current_understanding: tentativeTextSchema,
  paths: z.array(pathDraftSchema).length(5),
});

export function parseCrossroadOutput(data: unknown): MockCrossroadResult {
  return crossroadOutputSchema.parse(normalizeCrossroadThemesInOutput(data)) as MockCrossroadResult;
}
