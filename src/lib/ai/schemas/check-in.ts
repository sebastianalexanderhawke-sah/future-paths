import { z } from "zod";

import type { MockCheckInResult } from "@/lib/mock-checkin-generator";
import { normalizeCheckInThemesInOutput } from "@/lib/ai/schemas/theme-normalization";
import { tentativeTextSchema, checkInThemeChangeSchema, identityImpactSchema } from "@/lib/ai/schemas/shared";

export const checkInOutputSchema = z.object({
  reality_summary: tentativeTextSchema,
  theme_changes: z.array(checkInThemeChangeSchema).min(1).max(3),
  identity_impact: identityImpactSchema,
}) satisfies z.ZodType<MockCheckInResult>;

export function parseCheckInOutput(data: unknown): MockCheckInResult {
  return checkInOutputSchema.parse(normalizeCheckInThemesInOutput(data));
}
