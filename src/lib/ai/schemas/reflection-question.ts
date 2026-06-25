import { reflectionQuestionOutputSchema, type ReflectionQuestionResult } from "@/lib/reflection-question";

export type { ReflectionQuestionResult };

export function parseReflectionQuestionOutput(data: unknown): ReflectionQuestionResult {
  return reflectionQuestionOutputSchema.parse(data);
}
