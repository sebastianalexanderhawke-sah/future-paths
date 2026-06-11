import { z } from "zod";

import type { MockIdentityPromptDraft } from "@/lib/mock-identity-prompt-generator";
import {
  identityPromptTypeSchema,
  tentativeTextSchema,
  themesSchema,
} from "@/lib/ai/schemas/shared";

export const identityPromptDraftSchema = z.object({
  prompt_type: identityPromptTypeSchema,
  question: tentativeTextSchema,
  context: tentativeTextSchema.nullable(),
  themes: themesSchema,
}) satisfies z.ZodType<MockIdentityPromptDraft>;

export const identityPromptOutputSchema = z.array(identityPromptDraftSchema).min(1).max(3);

export const identityPromptDiscoverOutputSchema = z
  .array(identityPromptDraftSchema)
  .max(3) satisfies z.ZodType<MockIdentityPromptDraft[]>;

export function parseIdentityPromptOutput(data: unknown): MockIdentityPromptDraft[] {
  if (Array.isArray(data) && data.length === 0) {
    return [];
  }

  return identityPromptOutputSchema.parse(data);
}
