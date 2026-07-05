import type { z } from "zod";

import { buildIdentityContext } from "@/lib/ai/context/builder";
import type { BuildContextOptions } from "@/lib/ai/context/profiles";
import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import type { PromptId } from "@/lib/ai/prompts/ids";
import { getIdentityAIProvider } from "@/lib/ai/providers";
import { streamStructuredGeneration } from "@/lib/ai/providers/claude-provider";
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
 * Uses the mock provider (no streaming) only when the engine itself is in
 * mock mode. There is deliberately no mock fallback on failure: the streaming
 * routes persist their results (moments, paths, forecasts), and fabricated
 * mock content must never be stored as if it were real analysis.
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

  const primaryProvider = getIdentityAIProvider();

  if (primaryProvider.id === "mock") {
    const result = await primaryProvider.completeStructured(request);
    return result;
  }

  return streamStructuredGeneration(request, onChunk);
}
