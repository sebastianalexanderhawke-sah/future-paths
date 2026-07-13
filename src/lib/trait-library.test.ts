import { describe, expect, it } from "vitest";

import { ALL_DIMENSIONS } from "@/lib/behavior-signals";
import { TRAIT_LIBRARY, traitForFutureSelf } from "@/lib/trait-library";

describe("trait library", () => {
  it("covers every identity dimension with a label and a one-sentence quote", () => {
    for (const dimension of ALL_DIMENSIONS) {
      const trait = TRAIT_LIBRARY[dimension];
      expect(trait.label.trim().length).toBeGreaterThan(0);
      expect(trait.quote.trim().length).toBeGreaterThan(0);
      // One plain sentence: no newlines, ends with a single period.
      expect(trait.quote).not.toContain("\n");
      expect(trait.quote.trim().endsWith(".")).toBe(true);
    }
  });

  it("keeps trait labels unique — two cards must never share a headline for different dimensions", () => {
    const labels = ALL_DIMENSIONS.map((d) => TRAIT_LIBRARY[d].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never labels a trait with the product's own name", () => {
    for (const dimension of ALL_DIMENSIONS) {
      expect(TRAIT_LIBRARY[dimension].label).not.toBe("Reflection");
    }
  });
});

describe("traitForFutureSelf", () => {
  it("derives the trait from the strongest dimension contribution", () => {
    const trait = traitForFutureSelf({
      dimension_breakdown: [
        { dimension: "Consistency", identityWeight: 1, userScore: 6, contribution: 6 },
        { dimension: "Initiative", identityWeight: 0.4, userScore: 4, contribution: 1.6 },
      ],
    });
    expect(trait).toEqual(TRAIT_LIBRARY.Consistency);
    expect(trait?.label).toBe("Discipline");
  });

  it("returns null for rows without a usable breakdown — the card falls back to the stored name", () => {
    expect(traitForFutureSelf({ dimension_breakdown: null })).toBeNull();
    expect(traitForFutureSelf({ dimension_breakdown: [] })).toBeNull();
    expect(
      traitForFutureSelf({ dimension_breakdown: [{ dimension: "Not A Dimension" }] }),
    ).toBeNull();
  });
});
