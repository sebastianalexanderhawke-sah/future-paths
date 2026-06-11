import { z } from "zod";

import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import {
  futureSelfStageSchema,
  tentativeTextSchema,
  themesSchema,
} from "@/lib/ai/schemas/shared";

export const futureSelfDraftSchema = z.object({
  name: tentativeTextSchema,
  description: tentativeTextSchema,
  stage: futureSelfStageSchema,
  momentum: z.number().int().min(0).max(100),
  themes: themesSchema,
}) satisfies z.ZodType<MockFutureSelfDraft>;

export const futureSelfOutputSchema = z.array(futureSelfDraftSchema).min(1).max(3);

export const futureSelfDiscoverOutputSchema = z
  .array(futureSelfDraftSchema)
  .max(3) satisfies z.ZodType<MockFutureSelfDraft[]>;

export function parseFutureSelfOutput(data: unknown): MockFutureSelfDraft[] {
  if (Array.isArray(data) && data.length === 0) {
    return [];
  }

  return futureSelfOutputSchema.parse(data);
}
