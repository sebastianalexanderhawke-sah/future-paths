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
        headline: "",
        summary: "You may be noticing a pattern.",
        themes: ["Growth"],
      }),
    ).toThrow();
  });
});
