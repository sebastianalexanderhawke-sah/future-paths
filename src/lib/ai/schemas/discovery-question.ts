import { z } from "zod";

export const discoveryQuestionCategorySchema = z.enum([
  "Relationships",
  "Career",
  "Business",
  "Relocation",
  "Education",
  "Health",
  "Finance",
  "Family",
  "Custom",
]);

export const discoveryQuestionItemSchema = z.object({
  question: z.string().trim().min(1).max(200),
  category: discoveryQuestionCategorySchema,
  reason: z.string().trim().min(1).max(300),
});

export const discoveryQuestionOutputSchema = z.object({
  questions: z.array(discoveryQuestionItemSchema).min(4).max(5),
});

export type DiscoveryQuestionOutput = z.infer<typeof discoveryQuestionOutputSchema>;

export function parseDiscoveryQuestionOutput(data: unknown): DiscoveryQuestionOutput {
  return discoveryQuestionOutputSchema.parse(data);
}
