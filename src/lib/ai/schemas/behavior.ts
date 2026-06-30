import { z } from "zod";

import { SIGNAL_SLUGS } from "@/lib/behavior-signals";

export const behaviorObservationDraftSchema = z.object({
  observation: z.string().trim().min(10).max(200),
  signals: z.array(z.enum(SIGNAL_SLUGS)).min(0).max(2),
});

export const behaviorExtractionOutputSchema = z.object({
  observations: z.array(behaviorObservationDraftSchema).min(0).max(8),
});

export type BehaviorObservationDraft = z.infer<typeof behaviorObservationDraftSchema>;
export type BehaviorExtractionOutput = z.infer<typeof behaviorExtractionOutputSchema>;
