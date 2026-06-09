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

export function parseIdentityPromptOutput(data: unknown): MockIdentityPromptDraft[] {
  return identityPromptOutputSchema.parse(data);
}
