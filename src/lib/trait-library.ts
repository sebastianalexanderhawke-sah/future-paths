import type { IdentityDimension } from "@/types/behavior";
import type { FutureSelf } from "@/types/database";

/**
 * The trait layer of Future Selves (Phase 4): each future is presented as a
 * STRENGTHENING TRAIT rather than an archetype. The trait is derived
 * deterministically from the row's persisted dimension_breakdown (the top
 * contributing identity dimension — already sorted strongest-first by the
 * recognition engine), so it needs no schema change, no AI call, and works
 * for every row the engine has ever written.
 *
 * Labels and quotes are hand-written here and never AI-generated — the same
 * contract as IdentityProfile.identity_statement. Labels translate internal
 * dimension vocabulary into everyday trait words ("Consistency" reads as a
 * system metric; "Discipline" reads as a person). "Reflection" the dimension
 * is labeled "Self-Awareness" so a trait never shares the product's name.
 */
export type TraitProfile = {
  /** Everyday display name for the trait — the card's headline. */
  label: string;
  /** One plain sentence, quoted under the trait name. */
  quote: string;
};

export const TRAIT_LIBRARY: Record<IdentityDimension, TraitProfile> = {
  Independence: {
    label: "Independence",
    quote: "You trust your own judgment before anyone confirms it.",
  },
  Connection: {
    label: "Connection",
    quote: "You keep choosing people, even when going alone would be simpler.",
  },
  Initiative: {
    label: "Initiative",
    quote: "You start things before anyone asks you to.",
  },
  Reflection: {
    label: "Self-Awareness",
    quote: "You stop and look at your own patterns before they harden.",
  },
  Adaptability: {
    label: "Adaptability",
    quote: "You change course when the situation changes, not when it's comfortable.",
  },
  Curiosity: {
    label: "Curiosity",
    quote: "You follow what's interesting past the point where most people stop.",
  },
  Consistency: {
    label: "Discipline",
    quote: "You keep showing up after the excitement wears off.",
  },
  "Risk Tolerance": {
    label: "Courage",
    quote: "You act while the outcome is still uncertain.",
  },
  Vulnerability: {
    label: "Openness",
    quote: "You let people see the unfinished parts.",
  },
  "Conflict Tolerance": {
    label: "Directness",
    quote: "You say the uncomfortable thing while it can still help.",
  },
};

function isIdentityDimension(value: unknown): value is IdentityDimension {
  return typeof value === "string" && value in TRAIT_LIBRARY;
}

/**
 * The strengthening trait behind one Future Self row: the top entry of the
 * persisted dimension_breakdown (strongest contribution first, as the
 * engine writes it). Null when the row carries no usable breakdown — the
 * card then falls back to the row's stored name, so legacy and fixture rows
 * degrade gracefully instead of rendering an empty headline.
 */
export function traitForFutureSelf(
  futureSelf: Pick<FutureSelf, "dimension_breakdown">,
): TraitProfile | null {
  const top = futureSelf.dimension_breakdown?.[0];
  if (!top) return null;

  const dimension = (top as Record<string, unknown>).dimension;
  return isIdentityDimension(dimension) ? TRAIT_LIBRARY[dimension] : null;
}
