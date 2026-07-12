import { z } from "zod";

import { tentativeTextSchema } from "@/lib/ai/schemas/shared";

export type ForecastFutureDraft = {
  title: string;
  /** Forecasts v3: newline-joined "Why Reflection thinks this" bullets.
   *  Pre-v3 rows and legacy fixtures hold a single paragraph — rendering
   *  splits on newlines, so both shapes display correctly. */
  why: string;
  /** Forecasts v3: newline-joined "What could happen" bullets. Pre-v3 rows
   *  hold a single sentence. */
  impact: string;
  /** Exactly 3 concrete early-evidence phrases supplied by the AI. Optional
   *  so that inline test fixtures and older cached data shapes without signals
   *  remain valid; buildSignalsFromGeneratedFuture falls back to truncation. */
  signals?: string[];
  /** AI's honest estimate of how soon this future could realistically occur. */
  timeframe?: "days" | "weeks" | "months" | "longer_term";
  /** Forecasts v3: "What you can do" bullets — concrete preparation steps.
   *  Absent on pre-v3 rows; its presence is what selects the v3 card UI. */
  actions?: string[];
  /** Forecasts v3: honest 0-100 estimate of how likely this scenario is.
   *  Used only for display ordering (highest first); absent on pre-v3 rows. */
  confidence?: number;
};

// Forecasts v3 (Phase 2): a forecast is a set of 6-8 practical decision
// cards — 5-6 realistic "What Could Go Wrong" scenarios plus 1-2 unexpected
// opportunities. The MODEL outputs the v3 section names (risks /
// opportunities); parseForecastOutput maps them onto these legacy transport
// keys so storage, rendering, diffing, and audit plumbing stay
// byte-compatible with every previously saved forecast:
//   active      ← (empty for v3 generations; still read from old rows)
//   hidden      ← risks (5-6) — realistic ways this path goes wrong
//   blind_spots ← (empty since v2; still read from old rows)
//   wild_card   ← opportunities (1-2) — unexpected upsides worth noticing
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
  actions: z.array(tentativeTextSchema).min(1).max(4).optional(),
  confidence: z.number().min(0).max(100).optional(),
}) satisfies z.ZodType<ForecastFutureDraft>;

// The shape each forecast card takes in v3 model output. Bullets are short
// phrases; the normalizer below joins them with newlines onto the legacy
// draft string fields so every downstream consumer keeps a single shape.
const forecastCardSchema = z.object({
  title: tentativeTextSchema,
  what_could_happen: z.array(tentativeTextSchema).min(2).max(4),
  why_this: z.array(tentativeTextSchema).min(2).max(4),
  what_you_can_do: z.array(tentativeTextSchema).min(2).max(4),
  confidence: z.number().min(0).max(100),
  timeframe: z.enum(["days", "weeks", "months", "longer_term"]).optional(),
});

// Forecasts v3: 6-8 cards — 5-6 risks (hidden) and 1-2 opportunities
// (wild_card). A section outside its range fails the whole generation
// (surfaced as an error by runFutureForecastAction) rather than silently
// shipping a thin or fallback-padded set. active and blind_spots are
// retired for new generations but remain valid (empty) transport keys so
// stored v1/v2 forecasts still parse.
export const forecastOutputSchema = z.object({
  current_understanding: tentativeTextSchema.optional(),
  active: z.array(forecastFutureSchema).max(0),
  hidden: z.array(forecastFutureSchema).min(5).max(6),
  blind_spots: z.array(forecastFutureSchema).max(0),
  wild_card: z.array(forecastFutureSchema).min(1).max(2),
}) satisfies z.ZodType<ForecastOutput>;

// Accepts the v3 model keys, the v2 model keys, AND the legacy transport
// keys, so cached payloads and old fixtures keep parsing while new
// generations use the semantically named sections.
const looseForecastShape = z.object({
  current_understanding: z.unknown().optional(),
  risks: z.array(z.unknown()).optional(),
  opportunities: z.array(z.unknown()).optional(),
  likely_developments: z.array(z.unknown()).optional(),
  failure_modes: z.array(z.unknown()).optional(),
  alternative_outcomes: z.array(z.unknown()).optional(),
  active: z.array(z.unknown()).optional(),
  hidden: z.array(z.unknown()).optional(),
  blind_spots: z.array(z.unknown()).optional(),
  wild_card: z.array(z.unknown()).optional(),
});

// Phase 3: every card section is exactly two bullets — the schema tolerates
// up to four (a harmless extra bullet must not fail the whole generation),
// but only the first two are kept, so stored cards stay uniformly short.
const BULLETS_PER_SECTION = 2;

function toDraftFromCard(card: z.infer<typeof forecastCardSchema>): ForecastFutureDraft {
  return {
    title: card.title,
    why: card.why_this.slice(0, BULLETS_PER_SECTION).join("\n"),
    impact: card.what_could_happen.slice(0, BULLETS_PER_SECTION).join("\n"),
    actions: card.what_you_can_do.slice(0, BULLETS_PER_SECTION),
    confidence: card.confidence,
    ...(card.timeframe ? { timeframe: card.timeframe } : {}),
  };
}

function filterItems(raw: unknown[]): ForecastFutureDraft[] {
  const kept: ForecastFutureDraft[] = [];

  for (const item of raw) {
    // v3 card shape takes precedence (its field names don't overlap with the
    // draft shape, so a successful parse is unambiguous); the flat draft
    // shape remains the fallback for cached payloads and old fixtures.
    const cardResult = forecastCardSchema.safeParse(item);
    if (cardResult.success) {
      kept.push(toDraftFromCard(cardResult.data));
      continue;
    }

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

  // v3 section names take precedence, then v2 names, then legacy transport
  // keys for cached payloads and old fixtures. A v3 generation therefore
  // lands as: active=[], hidden=risks (5-6), blind_spots=[],
  // wild_card=opportunities (1-2).
  return {
    ...(understandingResult?.success ? { current_understanding: understandingResult.data } : {}),
    active: filterItems(shape.likely_developments ?? shape.active ?? []),
    hidden: filterItems(shape.risks ?? shape.failure_modes ?? shape.hidden ?? []),
    blind_spots: filterItems(shape.blind_spots ?? []),
    wild_card: filterItems(shape.opportunities ?? shape.alternative_outcomes ?? shape.wild_card ?? []),
  };
}
