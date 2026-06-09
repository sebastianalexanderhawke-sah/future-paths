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
import { mockProvider } from "@/lib/ai/providers/mock-provider";
import type { GenerationResult } from "@/lib/ai/types";
import { getUsageTracker } from "@/lib/ai/usage";

export type RunStructuredGenerationOptions<T> = BuildContextOptions & {
  promptId: PromptId;
  schema: z.ZodType<T>;
};

export async function runStructuredGeneration<T>(
  options: RunStructuredGenerationOptions<T>,
): Promise<GenerationResult<T>> {
  const startedAt = Date.now();
  const prompt = getPromptDefinition(options.promptId);
  const contextResult = await buildIdentityContext(options);

  if ("error" in contextResult) {
    return {
      ok: false,
      error: contextResult.error,
      fallbackAvailable: false,
    };
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
  const usageTracker = getUsageTracker();
  const primaryResult = await primaryProvider.completeStructured(request);

  if (primaryResult.ok) {
    await usageTracker.track({
      userId: options.userId,
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      provider: primaryResult.metadata.provider,
      success: true,
      durationMs: Date.now() - startedAt,
    });

    return primaryResult;
  }

  await usageTracker.track({
    userId: options.userId,
    promptId: prompt.promptId,
    promptVersion: prompt.promptVersion,
    provider: primaryProvider.id,
    success: false,
    durationMs: Date.now() - startedAt,
    error: primaryResult.error,
  });

  if (!shouldFallbackToMockOnError(mode) || primaryProvider.id === "mock") {
    return primaryResult;
  }

  const fallbackResult = await mockProvider.completeStructured(request);

  if (fallbackResult.ok) {
    await usageTracker.track({
      userId: options.userId,
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      provider: "mock",
      success: true,
      durationMs: Date.now() - startedAt,
      error: `Fallback after ${primaryProvider.id} failure: ${primaryResult.error}`,
    });
  }

  return fallbackResult;
}
