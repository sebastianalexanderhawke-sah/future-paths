import Anthropic from "@anthropic-ai/sdk";

import {
  getAnthropicApiKey,
  getClaudeModel,
  getGenerationTimeoutMs,
} from "@/lib/ai/config";
import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import {
  toGenerationFailure,
  toGenerationSuccess,
  validateStructuredOutput,
  type IdentityAIProvider,
} from "@/lib/ai/providers/types";
import type { StructuredGenerationRequest } from "@/lib/ai/types";
import type { PromptId } from "@/lib/ai/prompts/ids";

function extractJson(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }

    const start = trimmed.indexOf("{");
    const arrayStart = trimmed.indexOf("[");
    const index =
      start === -1
        ? arrayStart
        : arrayStart === -1
          ? start
          : Math.min(start, arrayStart);

    if (index >= 0) {
      return JSON.parse(trimmed.slice(index));
    }

    throw new Error("Claude response did not contain JSON.");
  }
}

export const claudeProvider: IdentityAIProvider = {
  id: "claude",

  async completeStructured<T>(request: StructuredGenerationRequest<T>) {
    const apiKey = getAnthropicApiKey();

    if (!apiKey) {
      return toGenerationFailure("ANTHROPIC_API_KEY is not configured.", true);
    }

    try {
      const prompt = getPromptDefinition(request.promptId as PromptId);

      if (request.promptId === "timeline.generate") {
        const candidates = request.context.chapterCandidates;

        if (candidates !== undefined) {
          const parsed = prompt.parseOutput(candidates);
          const data = validateStructuredOutput(request.schema, parsed);

          return toGenerationSuccess({
            provider: "claude",
            promptId: prompt.promptId,
            promptVersion: prompt.promptVersion,
            data,
          });
        }
      }

      const client = new Anthropic({ apiKey });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getGenerationTimeoutMs());

      console.log("MODEL USED:", getClaudeModel());
      
      const response = await client.messages.create(
        {
          model: getClaudeModel(),
          max_tokens: request.options?.maxTokens ?? 4096,
          temperature: request.options?.temperature ?? 0.4,
          system: prompt.buildSystemPrompt(),
          messages: [
            {
              role: "user",
              content: prompt.buildUserPrompt(request.context),
            },
          ],
        },
        { signal: controller.signal },
      );

      clearTimeout(timeout);

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) {
        return toGenerationFailure("Claude returned an empty response.", true);
      }

      const raw = extractJson(text);
      const parsed = prompt.parseOutput(raw);
      const data = validateStructuredOutput(request.schema, parsed);

      return toGenerationSuccess({
        provider: "claude",
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        data,
      });
    } catch (error) {
      console.error("CLAUDE ERROR:", error);
      const message =
        error instanceof Error ? error.message : "Claude generation failed.";
      return toGenerationFailure(message, true);
    }
  },
};
