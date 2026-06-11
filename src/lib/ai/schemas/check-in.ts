import { z } from "zod";

import type { MockCheckInResult } from "@/lib/mock-checkin-generator";
import { normalizeCheckInThemesInOutput } from "@/lib/ai/schemas/theme-normalization";
import { tentativeTextSchema, themeChangeSchema } from "@/lib/ai/schemas/shared";

export const checkInOutputSchema = z.object({
  reality_summary: tentativeTextSchema,
  theme_changes: z.array(themeChangeSchema).min(1).max(3),
  identity_impact: tentativeTextSchema,
}) satisfies z.ZodType<MockCheckInResult>;

export function parseCheckInOutput(data: unknown): MockCheckInResult {
  return checkInOutputSchema.parse(normalizeCheckInThemesInOutput(data));
}
