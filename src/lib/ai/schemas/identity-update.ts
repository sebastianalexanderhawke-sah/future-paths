import { z } from "zod";

import type { MockIdentityUpdateDraft } from "@/lib/mock-identity-update-generator";
import {
  identityUpdateTypeSchema,
  tentativeTextSchema,
  themesSchema,
} from "@/lib/ai/schemas/shared";
import { normalizeIdentityUpdateInOutput } from "@/lib/ai/schemas/theme-normalization";

export const identityUpdateOutputSchema = z.object({
  update_type: identityUpdateTypeSchema,
  title: tentativeTextSchema,
  summary: tentativeTextSchema,
  themes: themesSchema,
}) satisfies z.ZodType<MockIdentityUpdateDraft>;

export const identityUpdateNullableOutputSchema =
  identityUpdateOutputSchema.nullable();

export function parseIdentityUpdateOutput(
  data: unknown,
): MockIdentityUpdateDraft | null {
  if (data === null) {
    return null;
  }

  return identityUpdateOutputSchema.parse(normalizeIdentityUpdateInOutput(data));
}
