import { describe, expect, it } from "vitest";

import {
  deriveIdentityConfidence,
  deriveIdentityFoundations,
} from "@/lib/current-self-hero";

describe("deriveIdentityFoundations", () => {
  it("returns nothing when no theme grounds a foundation", () => {
    // Difficult themes never anchor an identity foundation.
    expect(deriveIdentityFoundations(["Uncertainty", "Grief"])).toEqual([]);
    expect(deriveIdentityFoundations([])).toEqual([]);
    expect(deriveIdentityFoundations(null)).toEqual([]);
  });

  it("maps positive themes to identity-anchored foundations, strongest first", () => {
    const foundations = deriveIdentityFoundations(["Growth", "Independence"]);
    expect(foundations).toHaveLength(2);
    expect(foundations[0].title).toBe("Becoming more capable");
    expect(foundations[1].title).toBe("Living on your own terms");
    expect(foundations[0].sentence.length).toBeGreaterThan(0);
  });

  it("caps at 3 even with more positive themes present", () => {
    const foundations = deriveIdentityFoundations([
      "Growth",
      "Independence",
      "Courage",
      "Connection",
      "Curiosity",
    ]);
    expect(foundations).toHaveLength(3);
  });

  it("de-dups by foundation title so the same idea never repeats", () => {
    const foundations = deriveIdentityFoundations(["Growth", "Growth"]);
    expect(foundations).toHaveLength(1);
  });

  it("skips difficult themes but keeps positive ones in order", () => {
    const foundations = deriveIdentityFoundations([
      "Uncertainty",
      "Courage",
      "Loneliness",
      "Stability",
    ]);
    expect(foundations.map((f) => f.title)).toEqual([
      "Facing hard things directly",
      "Building something that lasts",
    ]);
  });
});

describe("deriveIdentityConfidence", () => {
  it("is High only with substantial volume and consistent foundations", () => {
    const c = deriveIdentityConfidence({
      checkInCount: 10,
      reflectionCount: 4,
      foundationCount: 3,
    });
    expect(c.level).toBe("high");
    expect(c.label).toBe("Strong");
  });

  it("is Growing when patterns are emerging but not settled", () => {
    const c = deriveIdentityConfidence({
      checkInCount: 4,
      reflectionCount: 1,
      foundationCount: 2,
    });
    expect(c.level).toBe("growing");
    expect(c.label).toBe("Moderate");
  });

  it("is Early when evidence is thin", () => {
    const c = deriveIdentityConfidence({
      checkInCount: 1,
      reflectionCount: 0,
      foundationCount: 1,
    });
    expect(c.level).toBe("early");
    expect(c.label).toBe("Weak");
  });

  it("does not reach High on volume alone without foundation consistency", () => {
    const c = deriveIdentityConfidence({
      checkInCount: 20,
      reflectionCount: 10,
      foundationCount: 1,
    });
    expect(c.level).not.toBe("high");
  });

  it("never mentions numbers in the explanation", () => {
    for (const input of [
      { checkInCount: 10, reflectionCount: 4, foundationCount: 3 },
      { checkInCount: 4, reflectionCount: 1, foundationCount: 2 },
      { checkInCount: 0, reflectionCount: 0, foundationCount: 0 },
    ]) {
      const { explanation } = deriveIdentityConfidence(input);
      // No statistics: no digits and no numeric counts. Qualitative mentions
      // ("as more reflections are recorded") are fine; exposing a number is not.
      expect(explanation).not.toMatch(/\d/);
      expect(explanation.toLowerCase()).not.toMatch(
        /\bnumber of\b|\btotal\b/,
      );
    }
  });
});
