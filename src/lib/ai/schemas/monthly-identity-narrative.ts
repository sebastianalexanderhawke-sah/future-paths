import { z } from "zod";

import { tentativeTextSchema } from "@/lib/ai/schemas/shared";
import type { MockMonthlyIdentityNarrativeDraft } from "@/lib/mock-monthly-identity-narrative-generator";

export const monthlyIdentityNarrativeDraftSchema = z.object({
  month: z.string().trim().min(1).max(40),
  headline: tentativeTextSchema,
  teaser: tentativeTextSchema,
  opening_beginning: tentativeTextSchema,
  opening_end: tentativeTextSchema,
}) satisfies z.ZodType<MockMonthlyIdentityNarrativeDraft>;

export const monthlyIdentityNarrativeOutputSchema = z
  .array(monthlyIdentityNarrativeDraftSchema)
  .max(24);

export const monthlyIdentityNarrativeDiscoverOutputSchema = z
  .array(monthlyIdentityNarrativeDraftSchema)
  .max(24) satisfies z.ZodType<MockMonthlyIdentityNarrativeDraft[]>;

export function parseMonthlyIdentityNarrativeOutput(
  data: unknown,
): MockMonthlyIdentityNarrativeDraft[] {
  if (Array.isArray(data) && data.length === 0) return [];
  return monthlyIdentityNarrativeOutputSchema.parse(data);
}
