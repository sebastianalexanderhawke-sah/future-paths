import { z } from "zod";

import { runStructuredGeneration } from "@/lib/ai/orchestrator";

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


export function parseReflectionQuestionResult(data: unknown): ReflectionQuestionResult {
  return reflectionQuestionOutputSchema.parse(data);
}

export async function evaluateReflectionQuestion(
  userId: string,
  reflection: string,
  realitySummary: string,
): Promise<ReflectionQuestionResult | null> {
  try {
    const result = await runStructuredGeneration({
      userId,
      profile: "reflection_question",
      promptId: "reflection_question.evaluate",
      schema: reflectionQuestionOutputSchema,
      overrides: { reflection, realitySummary },
    });

    if (!result.ok) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}
