import { z } from "zod";

import type { MockAlternateSelfDraft } from "@/lib/mock-alternate-self-generator";
import { tentativeTextSchema, themesSchema } from "@/lib/ai/schemas/shared";

export const alternateSelfOutputSchema = z.object({
  name: tentativeTextSchema,
  road_not_taken: tentativeTextSchema,
  alternate_self: tentativeTextSchema,
  what_remains_available: tentativeTextSchema,
  themes: themesSchema,
}) satisfies z.ZodType<MockAlternateSelfDraft>;

export function parseAlternateSelfOutput(data: unknown): MockAlternateSelfDraft {
  return alternateSelfOutputSchema.parse(data);
}
