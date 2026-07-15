import { z } from "zod";

/**
 * Output contract for emerging_situation.detect: does this situation's recent
 * check-ins/reflections consistently tell a different story than the one the
 * situation originally began with?
 *
 * The suggestion fields are drafts for the situation creation flow — the user
 * edits them before anything is saved, so they must read like a user-written
 * title and context, not like analysis.
 */
export const EMERGING_SITUATION_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export type EmergingSituationConfidence =
  (typeof EMERGING_SITUATION_CONFIDENCE_LEVELS)[number];

export const emergingSituationOutputSchema = z
  .object({
    new_story_detected: z.boolean(),
    confidence: z.enum(EMERGING_SITUATION_CONFIDENCE_LEVELS),
    suggested_title: z.string().nullable(),
    suggested_description: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.new_story_detected) {
      if (!value.suggested_title || !value.suggested_title.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "suggested_title is required when new_story_detected is true",
          path: ["suggested_title"],
        });
      }
      if (!value.suggested_description || !value.suggested_description.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "suggested_description is required when new_story_detected is true",
          path: ["suggested_description"],
        });
      }
    } else {
      if (value.suggested_title !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "suggested_title must be null when new_story_detected is false",
          path: ["suggested_title"],
        });
      }
      if (value.suggested_description !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "suggested_description must be null when new_story_detected is false",
          path: ["suggested_description"],
        });
      }
    }
  });

export type EmergingSituationResult = z.infer<typeof emergingSituationOutputSchema>;

export function parseEmergingSituationOutput(data: unknown): EmergingSituationResult {
  return emergingSituationOutputSchema.parse(data);
}
