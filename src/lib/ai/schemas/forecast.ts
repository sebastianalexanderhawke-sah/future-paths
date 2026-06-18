import { z } from "zod";

import { tentativeTextSchema } from "@/lib/ai/schemas/shared";

export type ForecastFutureDraft = {
  title: string;
  why: string;
  impact: string;
  /** Exactly 3 concrete early-evidence phrases supplied by the AI. Optional
   *  so that inline test fixtures and older cached data shapes without signals
   *  remain valid; buildSignalsFromGeneratedFuture falls back to truncation. */
  signals?: string[];
  /** AI's honest estimate of how soon this future could realistically occur. */
  timeframe?: "days" | "weeks" | "months" | "longer_term";
};

export type ForecastOutput = {
  /** Concise plain-language summary of what the system understands about the
   *  situation. Optional so cached data and test fixtures predating this
   *  field remain valid. */
  current_understanding?: string;
  active: ForecastFutureDraft[];
  hidden: ForecastFutureDraft[];
  blind_spots: ForecastFutureDraft[];
  wild_card: ForecastFutureDraft[];
};

export const forecastFutureSchema = z.object({
  title: tentativeTextSchema,
  why: tentativeTextSchema,
  impact: tentativeTextSchema,
  signals: z.array(tentativeTextSchema).length(3),
  timeframe: z.enum(["days", "weeks", "months", "longer_term"]),
}) satisfies z.ZodType<ForecastFutureDraft>;

// Arrays use .min(0) so an empty section (all items dropped by per-item
// validation) is still a valid parse result. fillSection's curated fallback
// append handles padding sparse or empty arrays to display minimums.
export const forecastOutputSchema = z.object({
  current_understanding: tentativeTextSchema.optional(),
  active: z.array(forecastFutureSchema).min(0).max(6),
  hidden: z.array(forecastFutureSchema).min(0).max(5),
  blind_spots: z.array(forecastFutureSchema).min(0).max(5),
  wild_card: z.array(forecastFutureSchema).min(0).max(4),
}) satisfies z.ZodType<ForecastOutput>;

const looseForecastShape = z.object({
  current_understanding: z.unknown().optional(),
  active: z.array(z.unknown()),
  hidden: z.array(z.unknown()),
  blind_spots: z.array(z.unknown()),
  wild_card: z.array(z.unknown()).optional(),
});

function filterItems(raw: unknown[]): ForecastFutureDraft[] {
  const kept: ForecastFutureDraft[] = [];

  for (const item of raw) {
    const result = forecastFutureSchema.safeParse(item);
    if (result.success) {
      kept.push(result.data);
    } else {
      const title =
        item !== null && typeof item === "object" && "title" in item
          ? String((item as Record<string, unknown>).title)
          : "(unknown)";
      console.warn(
        `[parseForecastOutput] Dropping item "${title}": ${result.error.issues.map((i) => i.message).join("; ")}`,
      );
    }
  }

  return kept;
}

export function parseForecastOutput(data: unknown): ForecastOutput {
  // Throw on malformed top-level structure (not an object with the three arrays).
  const shape = looseForecastShape.parse(data);

  const understandingResult =
    typeof shape.current_understanding === "string"
      ? tentativeTextSchema.safeParse(shape.current_understanding)
      : null;

  return {
    ...(understandingResult?.success ? { current_understanding: understandingResult.data } : {}),
    active: filterItems(shape.active),
    hidden: filterItems(shape.hidden),
    blind_spots: filterItems(shape.blind_spots),
    wild_card: filterItems(shape.wild_card ?? []),
  };
}
