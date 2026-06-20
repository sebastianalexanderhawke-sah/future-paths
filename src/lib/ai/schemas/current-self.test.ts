import { describe, expect, it } from "vitest";

import {
  currentSelfNullableOutputSchema,
  parseCurrentSelfOutput,
} from "@/lib/ai/schemas/current-self";

describe("current self output", () => {
  it("allows null discover results for prerequisite handling", () => {
    expect(parseCurrentSelfOutput(null)).toBeNull();
    expect(currentSelfNullableOutputSchema.parse(null)).toBeNull();
  });

  it("still validates non-null drafts", () => {
    expect(() =>
      parseCurrentSelfOutput({
        title: "",
        summary: "You may be noticing a pattern.",
        themes: ["Growth", "Connection", "Stability", "Curiosity"],
        observations: ["A pattern may be showing up.", "Another observation.", "A third one."],
      }),
    ).toThrow();
  });

  it("rejects fewer than 4 themes", () => {
    expect(() =>
      parseCurrentSelfOutput({
        title: "Currently shaped by stability",
        summary: "You may be noticing a pattern.",
        themes: ["Growth", "Connection", "Stability"],
        observations: ["A pattern may be showing up.", "Another observation.", "A third one."],
      }),
    ).toThrow();
  });

  it("rejects fewer than 3 observations", () => {
    expect(() =>
      parseCurrentSelfOutput({
        title: "Currently shaped by stability",
        summary: "You may be noticing a pattern.",
        themes: ["Growth", "Connection", "Stability", "Curiosity"],
        observations: ["A pattern may be showing up."],
      }),
    ).toThrow();
  });

  it("accepts difficult themes alongside positive ones", () => {
    const result = parseCurrentSelfOutput({
      title: "Currently shaped by uncertainty and connection",
      summary: "You may be noticing a pattern.",
      themes: ["Uncertainty", "Disappointment", "Connection", "Stability"],
      observations: ["A pattern may be showing up.", "Another observation.", "A third one."],
    });

    expect(result?.themes).toContain("Uncertainty");
    expect(result?.themes).toContain("Disappointment");
  });
});
