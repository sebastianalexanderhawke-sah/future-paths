import { describe, expect, it } from "vitest";

import { firstSentence } from "@/lib/first-sentence";

describe("firstSentence", () => {
  it('returns "Hello world." from two sentences', () => {
    expect(firstSentence("Hello world. Second sentence.")).toBe("Hello world.");
  });

  it("truncates a long sentence to 150 chars with ...", () => {
    const long = `A long sentence ${"x".repeat(200)}.`;
    const result = firstSentence(long);
    expect(result.length).toBeLessThanOrEqual(150);
    expect(result.endsWith("...")).toBe(true);
  });

  it("returns empty string for empty input", () => {
    expect(firstSentence("")).toBe("");
    expect(firstSentence(null)).toBe("");
  });
});
