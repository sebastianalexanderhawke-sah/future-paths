import { describe, expect, it } from "vitest";

import {
  emergingSituationOutputSchema,
  parseEmergingSituationOutput,
} from "@/lib/ai/schemas/emerging-situation";
import { runMockGenerator } from "@/lib/ai/providers/mock-router";

describe("emergingSituationOutputSchema", () => {
  it("accepts a detected new story with both suggestion fields", () => {
    const result = parseEmergingSituationOutput({
      new_story_detected: true,
      confidence: "high",
      suggested_title: "Caring for Dad after his diagnosis",
      suggested_description:
        "My dad was diagnosed last month and I've become his main support. I'm coordinating appointments while working full time.",
    });

    expect(result.new_story_detected).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("accepts a no-detection result with null suggestions", () => {
    const result = parseEmergingSituationOutput({
      new_story_detected: false,
      confidence: "low",
      suggested_title: null,
      suggested_description: null,
    });

    expect(result.new_story_detected).toBe(false);
  });

  it("rejects a detection without a suggested title", () => {
    expect(() =>
      parseEmergingSituationOutput({
        new_story_detected: true,
        confidence: "high",
        suggested_title: null,
        suggested_description: "Something new is happening.",
      }),
    ).toThrow();
  });

  it("rejects a detection with a blank suggested description", () => {
    expect(() =>
      parseEmergingSituationOutput({
        new_story_detected: true,
        confidence: "high",
        suggested_title: "A new chapter",
        suggested_description: "   ",
      }),
    ).toThrow();
  });

  it("rejects suggestion fields on a no-detection result", () => {
    expect(() =>
      parseEmergingSituationOutput({
        new_story_detected: false,
        confidence: "low",
        suggested_title: "Leftover title",
        suggested_description: null,
      }),
    ).toThrow();
  });

  it("rejects unknown confidence levels", () => {
    expect(() =>
      parseEmergingSituationOutput({
        new_story_detected: false,
        confidence: "certain",
        suggested_title: null,
        suggested_description: null,
      }),
    ).toThrow();
  });

  it("keeps the mock provider conservative: never a detection", () => {
    const raw = runMockGenerator("emerging_situation.detect", {
      userId: "user-1",
      profile: "emerging_situation",
    });

    const result = emergingSituationOutputSchema.parse(raw);
    expect(result.new_story_detected).toBe(false);
  });
});
