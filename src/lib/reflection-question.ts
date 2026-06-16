import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { getAnthropicApiKey, getClaudeModel } from "@/lib/ai/config";

export type ReflectionQuestionResult = {
  should_reflect: boolean;
  question: string | null;
};

export const reflectionQuestionOutputSchema = z
  .object({
    should_reflect: z.boolean(),
    question: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.should_reflect && (!value.question || !value.question.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "question is required when should_reflect is true",
        path: ["question"],
      });
    }
    if (!value.should_reflect && value.question !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "question must be null when should_reflect is false",
        path: ["question"],
      });
    }
  });

const REFLECTION_QUESTION_SYSTEM_PROMPT = `You decide whether a check-in warrants a reflection question.
A reflection question is worth asking when the check-in describes:
a meaningful outcome (positive or negative), an unexpected result,
an emotional experience, a decision made, or a significant change.
It is NOT worth asking when the check-in describes:
nothing changing, routine updates, vague non-events ('still waiting', 'nothing happened').

If worth asking: return should_reflect: true and a single
reflection question (max 15 words) that helps understand what
this experience meant to the person — not what happened, but
what it revealed about them. Draw from these types:
- 'What surprised you most about what happened?'
- 'What outcome were you most worried about beforehand?'
- 'What mattered most to you in this situation?'
- 'What did this reveal about what you value?'
- 'What would you do differently in a similar situation?'

Make the question specific to the check-in content — not generic.

If not worth asking: return should_reflect: false, question: null.

Return JSON only: { should_reflect: boolean, question: string | null }`;

export function parseReflectionQuestionResult(data: unknown): ReflectionQuestionResult {
  return reflectionQuestionOutputSchema.parse(data);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Invalid JSON response");
  }
}

export async function evaluateReflectionQuestion(
  reflection: string,
  realitySummary: string,
): Promise<ReflectionQuestionResult | null> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 120,
      temperature: 0.2,
      system: REFLECTION_QUESTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Check-in reflection:\n${reflection}\n\nReality summary:\n${realitySummary}`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return parseReflectionQuestionResult(extractJsonObject(text));
  } catch {
    return null;
  }
}
