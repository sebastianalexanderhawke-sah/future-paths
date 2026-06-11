import { describe, expect, it } from "vitest";

import {
  parsePastAlternativePathOutput,
  pastAlternativePathOutputSchema,
} from "@/lib/ai/schemas/past-alternative-path";

describe("past alternative path output", () => {
  it("requires 3 to 5 path drafts", () => {
    expect(() => pastAlternativePathOutputSchema.parse([])).toThrow();
    expect(() => pastAlternativePathOutputSchema.parse([{}, {}, {}])).toThrow();

    const valid = parsePastAlternativePathOutput([
      {
        title: "Stay closer to home",
        description: "You might have chosen a nearby option instead.",
        themes: ["Stability"],
        possible_future_shift: "You may have built deeper local roots.",
      },
      {
        title: "Explore farther away",
        description: "You might have moved toward a wider environment.",
        themes: ["Independence", "Curiosity"],
        possible_future_shift: "You may have learned self-reliance sooner.",
      },
      {
        title: "Pause before deciding",
        description: "You might have waited before committing.",
        themes: ["Reflection"],
        possible_future_shift: "You may have tolerated ambiguity longer.",
      },
    ]);

    expect(valid).toHaveLength(3);
  });
});
