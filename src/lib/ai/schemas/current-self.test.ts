import { describe, expect, it } from "vitest";

import {
  currentSelfNullableOutputSchema,
  parseCurrentSelfOutput,
} from "@/lib/ai/schemas/current-self";

const VALID_DRAFT = {
  title: "Currently shaped by stability",
  summary: "Someone who tends to make deliberate choices under pressure.",
  themes: ["Growth", "Connection", "Stability", "Curiosity"],
  values: [
    "Freedom\nYou repeatedly choose autonomy even when it creates uncertainty.",
    "Growth\nYou willingly accept difficult paths if they lead somewhere meaningful.",
    "Meaning\nYou repeatedly sacrifice comfort for work that feels personally worthwhile.",
  ],
  afraid_of_becoming: [
    "Settling for comfort before growth.",
    "Living someone else's definition of success.",
  ],
  core_tension:
    "You want freedom. You also want stability. Nearly every major decision you've recorded has required choosing one over the other.",
  recent_growth: [
    "Recently you've become noticeably more comfortable making decisions alone.",
    "You're increasingly willing to sit with uncertainty instead of forcing resolution.",
  ],
};

describe("current self output", () => {
  it("allows null discover results for prerequisite handling", () => {
    expect(parseCurrentSelfOutput(null)).toBeNull();
    expect(currentSelfNullableOutputSchema.parse(null)).toBeNull();
  });

  it("still validates non-null drafts — rejects empty title", () => {
    expect(() =>
      parseCurrentSelfOutput({ ...VALID_DRAFT, title: "" }),
    ).toThrow();
  });

  it("rejects fewer than 4 themes", () => {
    expect(() =>
      parseCurrentSelfOutput({ ...VALID_DRAFT, themes: ["Growth", "Connection", "Stability"] }),
    ).toThrow();
  });

  it("rejects fewer than 3 values", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        values: ["Freedom\nYou repeatedly choose autonomy.", "Growth\nYou accept difficult paths."],
      }),
    ).toThrow();
  });

  it("rejects more than 3 values", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        values: ["A", "B", "C", "D"],
      }),
    ).toThrow();
  });

  it("requires exactly 3 values", () => {
    expect(parseCurrentSelfOutput({ ...VALID_DRAFT, values: ["A", "B", "C"] })?.values).toHaveLength(3);
  });

  it("accepts a single afraid_of_becoming item — fears are never padded to a target count", () => {
    const result = parseCurrentSelfOutput({
      ...VALID_DRAFT,
      afraid_of_becoming: ["Settling for comfort before growth."],
    });
    expect(result?.afraid_of_becoming).toHaveLength(1);
  });

  it("rejects an empty afraid_of_becoming array", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        afraid_of_becoming: [],
      }),
    ).toThrow();
  });

  it("rejects more than 3 afraid_of_becoming items", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        afraid_of_becoming: ["A", "B", "C", "D"],
      }),
    ).toThrow();
  });

  it("rejects empty core_tension", () => {
    expect(() =>
      parseCurrentSelfOutput({ ...VALID_DRAFT, core_tension: "" }),
    ).toThrow();
  });

  it("rejects empty recent_growth array", () => {
    expect(() =>
      parseCurrentSelfOutput({ ...VALID_DRAFT, recent_growth: [] }),
    ).toThrow();
  });

  it("rejects recent_growth with more than 3 items", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        recent_growth: ["A", "B", "C", "D"],
      }),
    ).toThrow();
  });

  it("accepts recent_growth with a single item", () => {
    const result = parseCurrentSelfOutput({ ...VALID_DRAFT, recent_growth: ["A"] });
    expect(result?.recent_growth).toHaveLength(1);
  });

  it("rejects missing recent_growth field", () => {
    const { recent_growth: _omitted, ...withoutGrowth } = VALID_DRAFT;
    expect(() => parseCurrentSelfOutput(withoutGrowth)).toThrow();
  });

  it("accepts a complete valid draft", () => {
    const result = parseCurrentSelfOutput(VALID_DRAFT);
    expect(result?.title).toBe(VALID_DRAFT.title);
    expect(result?.values).toHaveLength(3);
    expect(result?.afraid_of_becoming).toHaveLength(2);
    expect(result?.core_tension).toBe(VALID_DRAFT.core_tension);
    expect(result?.recent_growth).toHaveLength(2);
  });

  it("accepts difficult themes alongside positive ones", () => {
    const result = parseCurrentSelfOutput({
      ...VALID_DRAFT,
      themes: ["Uncertainty", "Disappointment", "Connection", "Stability"],
    });

    expect(result?.themes).toContain("Uncertainty");
    expect(result?.themes).toContain("Disappointment");
  });
});
