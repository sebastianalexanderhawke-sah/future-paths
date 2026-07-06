import Anthropic from "@anthropic-ai/sdk";

import {
  getAnthropicApiKey,
  getClaudeModel,
  getGenerationTimeoutMs,
} from "@/lib/ai/config";
import type { GenerationUsage } from "@/lib/ai/types";
import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import {
  toGenerationFailure,
  toGenerationSuccess,
  validateStructuredOutput,
  type IdentityAIProvider,
} from "@/lib/ai/providers/types";
import type { GenerationResult, StructuredGenerationRequest } from "@/lib/ai/types";
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

// System prompts are static per prompt module (base + task instructions with
// no per-request content), so they are marked as a cacheable prefix. Repeated
// calls to the same prompt within the cache TTL read the system portion at
// ~10% of input price; prompts below the model's minimum cacheable size are
// silently processed uncached (no error, no extra cost). This changes cost
// only — never model output.
function buildCacheableSystem(
  systemPrompt: string,
): Anthropic.Messages.TextBlockParam[] {
  return [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];
}

function toGenerationUsage(usage: Anthropic.Messages.Usage): GenerationUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    ...(usage.cache_creation_input_tokens != null
      ? { cacheCreationInputTokens: usage.cache_creation_input_tokens }
      : {}),
    ...(usage.cache_read_input_tokens != null
      ? { cacheReadInputTokens: usage.cache_read_input_tokens }
      : {}),
  };
}

export async function streamStructuredGeneration<T>(
  request: StructuredGenerationRequest<T>,
  onChunk: (text: string) => void,
): Promise<GenerationResult<T>> {
  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    return toGenerationFailure("ANTHROPIC_API_KEY is not configured.", true);
  }

  try {
    const prompt = getPromptDefinition(request.promptId as PromptId);
    const client = new Anthropic({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGenerationTimeoutMs());

    let fullText = "";

    try {
      const stream = client.messages.stream(
        {
          model: getClaudeModel(),
          max_tokens: request.options?.maxTokens ?? 4096,
          temperature: request.options?.temperature ?? 0.4,
          system: buildCacheableSystem(prompt.buildSystemPrompt()),
          messages: [
            {
              role: "user",
              content: prompt.buildUserPrompt(request.context),
            },
          ],
        },
        { signal: controller.signal },
      );

      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          fullText += chunk.delta.text;
          onChunk(chunk.delta.text);
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!fullText) {
      return toGenerationFailure("Claude returned an empty response.", true);
    }

    const raw = extractJson(fullText);
    const parsed = prompt.parseOutput(raw);
    const data = validateStructuredOutput(request.schema, parsed);

    return toGenerationSuccess({
      provider: "claude",
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Claude generation failed.";
    return toGenerationFailure(message, true);
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

      const response = await client.messages.create(
        {
          model: getClaudeModel(),
          max_tokens: request.options?.maxTokens ?? 4096,
          temperature: request.options?.temperature ?? 0.4,
          system: buildCacheableSystem(prompt.buildSystemPrompt()),
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
        usage: toGenerationUsage(response.usage),
      });
    } catch (error) {
      console.error(
        `[claude-provider] Generation failed promptId=${request.promptId}:`,
        error instanceof Error ? error.message : error,
      );
      const message =
        error instanceof Error ? error.message : "Claude generation failed.";
      return toGenerationFailure(message, true);
    }
  },
};
