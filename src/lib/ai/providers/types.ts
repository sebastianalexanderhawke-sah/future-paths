import type { z } from "zod";

import type {
  GenerationResult,
  GenerationSuccess,
  StructuredGenerationRequest,
} from "@/lib/ai/types";
import { createGenerationMetadata } from "@/lib/ai/types";

export interface IdentityAIProvider {
  readonly id: "mock" | "claude";
  completeStructured<T>(request: StructuredGenerationRequest<T>): Promise<GenerationResult<T>>;
}

export function toGenerationSuccess<T>(input: {
  provider: "mock" | "claude";
  promptId: string;
  promptVersion: string;
  data: T;
}): GenerationSuccess<T> {
  return {
    ok: true,
    data: input.data,
    metadata: createGenerationMetadata({
      provider: input.provider,
      promptId: input.promptId,
      promptVersion: input.promptVersion,
    }),
  };
}

export function toGenerationFailure(error: string, fallbackAvailable: boolean) {
  return {
    ok: false as const,
    error,
    fallbackAvailable,
  };
}

export function validateStructuredOutput<T>(
  schema: z.ZodType<T>,
  data: unknown,
): T {
  return schema.parse(data);
}
