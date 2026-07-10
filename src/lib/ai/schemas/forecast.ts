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

// Forecasts v2: a forecast is a believable timeline of the chosen path —
// exactly 8 moments. The MODEL outputs the v2 section names
// (likely_developments / failure_modes / alternative_outcomes);
// parseForecastOutput maps them onto these legacy transport keys so storage,
// rendering, diffing, and audit plumbing stay byte-compatible with every
// previously saved forecast:
//   active      ← likely_developments (3) — how the path naturally unfolds
//   hidden      ← failure_modes (3) — believable ways this path struggles
//   blind_spots ← (empty for v2 generations; still read from old rows)
//   wild_card   ← alternative_outcomes (2) — plausible unexpected turns
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
  // Optional to match ForecastFutureDraft: the prompt only guarantees
  // title/why/impact, so Claude doesn't reliably include these. When
  // signals is absent, buildSignalsFromGeneratedFuture derives it from
  // title/why/impact instead of the item being dropped entirely.
  signals: z.array(tentativeTextSchema).length(3).optional(),
  timeframe: z.enum(["days", "weeks", "months", "longer_term"]).optional(),
}) satisfies z.ZodType<ForecastFutureDraft>;

// Forecasts v2: exactly 8 futures — 3 likely developments (active), 3
// failure modes (hidden), 2 alternative outcomes (wild_card). A section
// missing its exact count fails the whole generation (surfaced as an error
// by runFutureForecastAction) rather than silently shipping a thin or
// fallback-padded timeline. blind_spots is retired for new generations but
// remains a valid (empty) transport key so stored v1 forecasts still parse.
export const forecastOutputSchema = z.object({
  current_understanding: tentativeTextSchema.optional(),
  active: z.array(forecastFutureSchema).length(3),
  hidden: z.array(forecastFutureSchema).length(3),
  blind_spots: z.array(forecastFutureSchema).max(0),
  wild_card: z.array(forecastFutureSchema).length(2),
}) satisfies z.ZodType<ForecastOutput>;

// Accepts BOTH the v2 model keys and the legacy transport keys, so cached
// v1 payloads and old fixtures keep parsing while new generations use the
// semantically named sections.
const looseForecastShape = z.object({
  current_understanding: z.unknown().optional(),
  likely_developments: z.array(z.unknown()).optional(),
  failure_modes: z.array(z.unknown()).optional(),
  alternative_outcomes: z.array(z.unknown()).optional(),
  active: z.array(z.unknown()).optional(),
  hidden: z.array(z.unknown()).optional(),
  blind_spots: z.array(z.unknown()).optional(),
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
  // Throw on malformed top-level structure (not an object).
  const shape = looseForecastShape.parse(data);

  const understandingResult =
    typeof shape.current_understanding === "string"
      ? tentativeTextSchema.safeParse(shape.current_understanding)
      : null;

  // v2 section names take precedence; legacy keys are the fallback for
  // cached payloads and old fixtures. A v2 generation therefore lands as:
  // active=likely (3), hidden=failure modes (3), blind_spots=[],
  // wild_card=alternatives (2).
  return {
    ...(understandingResult?.success ? { current_understanding: understandingResult.data } : {}),
    active: filterItems(shape.likely_developments ?? shape.active ?? []),
    hidden: filterItems(shape.failure_modes ?? shape.hidden ?? []),
    blind_spots: filterItems(shape.blind_spots ?? []),
    wild_card: filterItems(shape.alternative_outcomes ?? shape.wild_card ?? []),
  };
}
