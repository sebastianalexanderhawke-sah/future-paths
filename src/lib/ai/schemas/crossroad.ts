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
  paths: z.array(pathDraftSchema).min(5).max(7),
  // Situation polarity, generated alongside the candidate paths in this same
  // call: which approved themes this situation could strengthen versus
  // weaken, so a single situation can support some futures while working
  // against others instead of acting as undifferentiated evidence for all.
  opportunity_themes: themesSchema,
  risk_themes: themesSchema,
});

export function parseCrossroadOutput(data: unknown): MockCrossroadResult {
  return crossroadOutputSchema.parse(normalizeCrossroadThemesInOutput(data)) as MockCrossroadResult;
}
