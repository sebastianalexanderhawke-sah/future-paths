import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import { runMockGenerator } from "@/lib/ai/providers/mock-router";
import {
  toGenerationFailure,
  toGenerationSuccess,
  validateStructuredOutput,
  type IdentityAIProvider,
} from "@/lib/ai/providers/types";
import type { StructuredGenerationRequest } from "@/lib/ai/types";
import type { PromptId } from "@/lib/ai/prompts/ids";

export const mockProvider: IdentityAIProvider = {
  id: "mock",

  async completeStructured<T>(request: StructuredGenerationRequest<T>) {
    try {
      const prompt = getPromptDefinition(request.promptId as PromptId);
      const raw = runMockGenerator(request.promptId as PromptId, request.context);
      const parsed = prompt.parseOutput(raw);
      const data = validateStructuredOutput(request.schema, parsed);

      return toGenerationSuccess({
        provider: "mock",
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        data,
      });
    } catch (error) {
      return toGenerationFailure(
        error instanceof Error ? error.message : "Mock generation failed.",
        false,
      );
    }
  },
};
