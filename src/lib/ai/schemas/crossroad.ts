import { z } from "zod";

import type { MockCrossroadResult, MockPathDraft } from "@/lib/mock-crossroad-generator";
import { normalizeCrossroadThemesInOutput } from "@/lib/ai/schemas/theme-normalization";
import { tentativeTextSchema, themeNameSchema, themesSchema } from "@/lib/ai/schemas/shared";

export const pathDraftSchema = z.object({
  title: z.string().trim().max(80).default(""),
  description: tentativeTextSchema,
  // Situations v3: the direction this road leads — the destination, not the
  // first action. Used only by set-level diversity validation before persist;
  // never stored. Defaulted so a missing field degrades to the lexical
  // checks instead of failing the whole generation.
  direction: z.string().trim().max(80).default(""),
  // Situations v3: the assumption in the user's framing this path rejects,
  // when it is the set's assumption-challenging path. Empty for paths that
  // work within the user's framing. Validation-only; never stored.
  challenges_assumption: z.string().trim().max(300).default(""),
  benefits: z.array(tentativeTextSchema).min(2).max(4),
  consequences: z.array(tentativeTextSchema).min(2).max(4),
  future_shift: tentativeTextSchema,
  themes: themesSchema,
});

export const crossroadOutputSchema = z.object({
  current_understanding: tentativeTextSchema,
  // Situations v3: 3-5 directions instead of 5-7 strategies (v3.1 lowered
  // the ceiling from 6). The floor dropped because a forced minimum
  // manufactures implementation variants; three genuinely different roads
  // beat five variations.
  paths: z.array(pathDraftSchema).min(3).max(5),
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
