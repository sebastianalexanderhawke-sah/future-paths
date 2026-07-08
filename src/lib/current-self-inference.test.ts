import { describe, expect, it } from "vitest";

import { deriveFearsFromThemes, deriveValuesFromThemes } from "@/lib/current-self-inference";

describe("deriveValuesFromThemes", () => {
  it("returns empty when no themes have a grounded mapping", () => {
    expect(deriveValuesFromThemes([])).toEqual([]);
  });

  it("maps positive themes to Name\\nEvidence pairs", () => {
    const values = deriveValuesFromThemes(["Growth", "Stability"]);
    expect(values).toHaveLength(2);
    expect(values[0]).toMatch(/^Growth\n/);
    expect(values[1]).toMatch(/^Stability\n/);
  });

  it("skips difficult themes — struggling with something isn't valuing it", () => {
    const values = deriveValuesFromThemes(["Uncertainty", "Grief"]);
    expect(values).toEqual([]);
  });

  it("caps at 3 values even with more positive themes present", () => {
    const values = deriveValuesFromThemes([
      "Courage",
      "Connection",
      "Stability",
      "Independence",
      "Reflection",
      "Growth",
    ]);
    expect(values).toHaveLength(3);
  });

  it("does not duplicate a value for a repeated theme", () => {
    const values = deriveValuesFromThemes(["Growth", "Growth"]);
    expect(values).toHaveLength(1);
  });

  it("merges overlapping themes into the deeper value instead of listing both", () => {
    // Curiosity and Growth both map to the "Growth" value — they should
    // collapse into a single entry, not appear as two separate values.
    const values = deriveValuesFromThemes(["Curiosity", "Growth"]);
    expect(values).toHaveLength(1);
    expect(values[0]).toMatch(/^Growth\n/);
  });

  it("merges Independence into Freedom", () => {
    const values = deriveValuesFromThemes(["Independence"]);
    expect(values[0]).toMatch(/^Freedom\n/);
  });
});

describe("deriveFearsFromThemes", () => {
  it("returns empty when no themes have a grounded mapping", () => {
    expect(deriveFearsFromThemes([])).toEqual([]);
  });

  it("is not a mirror of deriveValuesFromThemes — it draws from the full theme list independently", () => {
    // Same themes produce both a value and a fear, but the fear text is not
    // a mechanical negation of the value's evidence, and difficult themes
    // (which never ground a value) can still ground a fear.
    const values = deriveValuesFromThemes(["Growth"]);
    const fears = deriveFearsFromThemes(["Growth"]);

    expect(values[0]).toMatch(/^Growth\n/);
    expect(fears[0]).toBe("Becoming comfortable before becoming capable.");
    expect(fears[0]).not.toContain(values[0]);
  });

  it("surfaces difficult-theme evidence as fears even though difficult themes never ground a value", () => {
    const values = deriveValuesFromThemes(["Uncertainty"]);
    const fears = deriveFearsFromThemes(["Uncertainty"]);

    expect(values).toEqual([]);
    expect(fears).toEqual([
      "Letting uncertainty make the decision for you instead of making it yourself.",
    ]);
  });

  it("prioritizes difficult themes over positive-theme fears", () => {
    const fears = deriveFearsFromThemes(["Growth", "Uncertainty", "Stability"]);
    expect(fears[0]).toBe(
      "Letting uncertainty make the decision for you instead of making it yourself.",
    );
  });

  it("two theme lists that produce the same value can produce different fears", () => {
    // Both lists ground the same "Growth" value (via Curiosity/Growth
    // merging), but different secondary evidence produces a different fear.
    const fearsA = deriveFearsFromThemes(["Curiosity", "Loneliness"]);
    const fearsB = deriveFearsFromThemes(["Curiosity", "Frustration"]);

    expect(deriveValuesFromThemes(["Curiosity"])[0]).toMatch(/^Growth\n/);
    expect(fearsA[0]).toBe("Convincing yourself you don't need anyone.");
    expect(fearsB[0]).toBe("Letting frustration talk you out of things that still matter to you.");
    expect(fearsA).not.toEqual(fearsB);
  });

  it("caps at 3 fears", () => {
    const fears = deriveFearsFromThemes([
      "Loneliness",
      "Disappointment",
      "Grief",
      "Frustration",
      "Uncertainty",
    ]);
    expect(fears).toHaveLength(3);
  });

  it("never returns duplicate fear text", () => {
    const fears = deriveFearsFromThemes(["Independence", "Independence"]);
    expect(fears).toHaveLength(1);
  });
});
