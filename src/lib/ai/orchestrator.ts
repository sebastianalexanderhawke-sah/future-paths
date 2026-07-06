import type { z } from "zod";

import { buildIdentityContext } from "@/lib/ai/context/builder";
import type { BuildContextOptions } from "@/lib/ai/context/profiles";
import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import type { PromptId } from "@/lib/ai/prompts/ids";
import { getIdentityAIProvider } from "@/lib/ai/providers";
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
      inputTokens: primaryResult.usage?.inputTokens,
      outputTokens: primaryResult.usage?.outputTokens,
      cacheCreationInputTokens: primaryResult.usage?.cacheCreationInputTokens,
      cacheReadInputTokens: primaryResult.usage?.cacheReadInputTokens,
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

  // No mock fallback: every caller of this function persists its result as
  // durable user data (check-ins, identity updates, Current Self, forecasts,
  // life chapters, …), and fabricated mock content must never be stored as
  // if it were real analysis. A failed generation surfaces as a failure the
  // caller (and user) can retry. Preview-only flows that want a fallback
  // implement their own, clearly labeled one (see discovery questions).
  return primaryResult;
}
