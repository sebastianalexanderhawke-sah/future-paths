import { z } from "zod";

import type { MockCurrentSelfDraft } from "@/lib/mock-current-self-generator";
import { tentativeTextSchema, themesSchema } from "@/lib/ai/schemas/shared";

export const currentSelfOutputSchema = z.object({
  headline: tentativeTextSchema,
  summary: tentativeTextSchema,
  themes: themesSchema,
}) satisfies z.ZodType<MockCurrentSelfDraft>;

export function parseCurrentSelfOutput(data: unknown): MockCurrentSelfDraft | null {
  if (data === null) {
    return null;
  }

  return currentSelfOutputSchema.parse(data);
}
