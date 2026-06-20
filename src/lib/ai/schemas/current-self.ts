import { z } from "zod";

import type { MockCurrentSelfDraft } from "@/lib/mock-current-self-generator";
import { checkInThemeNameSchema, tentativeTextSchema } from "@/lib/ai/schemas/shared";

// Current Self draws from the full theme vocabulary (positive + difficult) —
// unlike most other generators, it must be able to name struggle, tension,
// or contradiction as a theme, not just growth-oriented ones.
export const currentSelfThemesSchema = z.array(checkInThemeNameSchema).min(4).max(6);

// Each observation is a short, evidence-traceable statement about what
// appears true right now — not advice, not a prediction.
export const currentSelfObservationsSchema = z.array(tentativeTextSchema).min(3).max(5);

export const currentSelfOutputSchema = z.object({
  title: tentativeTextSchema,
  summary: tentativeTextSchema,
  themes: currentSelfThemesSchema,
  observations: currentSelfObservationsSchema,
}) satisfies z.ZodType<MockCurrentSelfDraft>;

export const currentSelfNullableOutputSchema =
  currentSelfOutputSchema.nullable();

export function parseCurrentSelfOutput(data: unknown): MockCurrentSelfDraft | null {
  if (data === null) {
    return null;
  }

  return currentSelfOutputSchema.parse(data);
}
