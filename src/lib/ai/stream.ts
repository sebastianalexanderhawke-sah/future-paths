import type { z } from "zod";

import { buildIdentityContext } from "@/lib/ai/context/builder";
import type { BuildContextOptions } from "@/lib/ai/context/profiles";
import {
  getIdentityEngineMode,
  shouldFallbackToMockOnError,
} from "@/lib/ai/config";
import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import type { PromptId } from "@/lib/ai/prompts/ids";
import { getIdentityAIProvider } from "@/lib/ai/providers";
import { streamStructuredGeneration } from "@/lib/ai/providers/claude-provider";
import { mockProvider } from "@/lib/ai/providers/mock-provider";
import type { GenerationResult } from "@/lib/ai/types";

export type RunStreamingGenerationOptions<T> = BuildContextOptions & {
  promptId: PromptId;
  schema: z.ZodType<T>;
};

/**
 * Streaming variant of runStructuredGeneration. Calls onChunk for each text
 * token as it arrives from the API. Returns the same GenerationResult when the
 * full response has been parsed and validated.
 *
 * Falls back to the mock provider (no streaming) when the engine is in mock
 * mode or when the primary provider fails and fallback is enabled.
 */
export async function runStreamingGeneration<T>(
  options: RunStreamingGenerationOptions<T>,
  onChunk: (text: string) => void,
): Promise<GenerationResult<T>> {
  const prompt = getPromptDefinition(options.promptId);
  const contextResult = await buildIdentityContext(options);

  if ("error" in contextResult) {
    return { ok: false, error: contextResult.error, fallbackAvailable: false };
  }

  const request = {
    profile: options.profile,
    promptId: prompt.promptId,
    promptVersion: prompt.promptVersion,
    context: contextResult,
    schema: options.schema,
  };

  const mode = getIdentityEngineMode();
  const primaryProvider = getIdentityAIProvider();

  if (primaryProvider.id === "mock") {
    const result = await primaryProvider.completeStructured(request);
    return result;
  }

  const result = await streamStructuredGeneration(request, onChunk);

  if (!result.ok && shouldFallbackToMockOnError(mode)) {
    return mockProvider.completeStructured(request);
  }

  return result;
}
