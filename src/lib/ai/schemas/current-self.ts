import { z } from "zod";

import type { MockCurrentSelfDraft } from "@/lib/mock-current-self-generator";
import { checkInThemeNameSchema, tentativeTextSchema } from "@/lib/ai/schemas/shared";

// Current Self draws from the full theme vocabulary (positive + difficult) —
// unlike most other generators, it must be able to name struggle, tension,
// or contradiction as a theme, not just growth-oriented ones.
export const currentSelfThemesSchema = z.array(checkInThemeNameSchema).min(4).max(6);

// Core traits: short one-phrase bullets describing who this person is.
export const currentSelfObservationsSchema = z.array(tentativeTextSchema).min(4).max(6);

// Recent growth: exactly 3 bullets describing what is currently shifting.
export const currentSelfRecentGrowthSchema = z.array(tentativeTextSchema).length(3);

export const currentSelfOutputSchema = z.object({
  title: tentativeTextSchema,
  summary: tentativeTextSchema,
  themes: currentSelfThemesSchema,
  observations: currentSelfObservationsSchema,
  recent_growth: currentSelfRecentGrowthSchema,
}) satisfies z.ZodType<MockCurrentSelfDraft>;

export const currentSelfNullableOutputSchema =
  currentSelfOutputSchema.nullable();

export function parseCurrentSelfOutput(data: unknown): MockCurrentSelfDraft | null {
  if (data === null) {
    return null;
  }

  return currentSelfOutputSchema.parse(data);
}
