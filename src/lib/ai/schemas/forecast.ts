import { z } from "zod";

import { tentativeTextSchema } from "@/lib/ai/schemas/shared";

export type ForecastFutureDraft = {
  title: string;
  why: string;
  impact: string;
};

export type ForecastOutput = {
  active: ForecastFutureDraft[];
  hidden: ForecastFutureDraft[];
  blind_spots: ForecastFutureDraft[];
};

export const forecastFutureSchema = z.object({
  title: tentativeTextSchema,
  why: tentativeTextSchema,
  impact: tentativeTextSchema,
}) satisfies z.ZodType<ForecastFutureDraft>;

export const forecastOutputSchema = z.object({
  active: z.array(forecastFutureSchema).min(1).max(6),
  hidden: z.array(forecastFutureSchema).min(1).max(5),
  blind_spots: z.array(forecastFutureSchema).min(1).max(5),
}) satisfies z.ZodType<ForecastOutput>;

export function parseForecastOutput(data: unknown): ForecastOutput {
  return forecastOutputSchema.parse(data);
}
