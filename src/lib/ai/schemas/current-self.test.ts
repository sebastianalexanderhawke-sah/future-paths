import { describe, expect, it } from "vitest";

import {
  currentSelfNullableOutputSchema,
  parseCurrentSelfOutput,
} from "@/lib/ai/schemas/current-self";

const VALID_DRAFT = {
  title: "Currently shaped by stability",
  summary: "Someone who tends to make deliberate choices under pressure.",
  themes: ["Growth", "Connection", "Stability", "Curiosity"],
  observations: [
    "Acts before certainty arrives",
    "Recovers quickly from setbacks",
    "Prefers direct communication",
    "Thinks independently under pressure",
  ],
  recent_growth: [
    "Becoming more comfortable making decisions alone",
    "Learning to tolerate uncertainty without forcing resolution",
    "Trusting personal judgment more than external validation",
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

  it("rejects fewer than 4 core trait observations", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        observations: ["Acts before certainty arrives", "Recovers quickly"],
      }),
    ).toThrow();
  });

  it("rejects more than 4 core trait observations", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        observations: ["A", "B", "C", "D", "E"],
      }),
    ).toThrow();
  });

  it("rejects recent_growth with fewer than 3 items", () => {
    expect(() =>
      parseCurrentSelfOutput({
        ...VALID_DRAFT,
        recent_growth: ["Becoming more comfortable making decisions alone"],
      }),
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

  it("rejects missing recent_growth field", () => {
    const { recent_growth: _omitted, ...withoutGrowth } = VALID_DRAFT;
    expect(() => parseCurrentSelfOutput(withoutGrowth)).toThrow();
  });

  it("accepts a complete valid draft", () => {
    const result = parseCurrentSelfOutput(VALID_DRAFT);
    expect(result?.title).toBe(VALID_DRAFT.title);
    expect(result?.observations).toHaveLength(4);
    expect(result?.recent_growth).toHaveLength(3);
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
