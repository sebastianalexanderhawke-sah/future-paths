import { describe, expect, it } from "vitest";

import { buildGroundingBundle } from "@/components/home/forecast-grounding";
import {
  computeForecastExplanationPreservationMetrics,
  resolveForecastExplanation,
  shouldPreserveForecastExplanation,
  validateForecastExplanation,
} from "@/lib/forecast-explanation-preservation";

describe("forecast explanation preservation", () => {
  const workInitiationWhy =
    "She initiates conversation every time you are both at work, which may signal she enjoys your company and welcomes more of it.";
  const personalityWhy =
    "Being extremely nice at work may reflect her general personality rather than specific romantic interest, making a friendly refusal a realistic outcome.";

  const bundle = buildGroundingBundle({
    situationTitle: "there a girl i like at work",
    contextSummary: "How often does she initiate conversations?\nDaily",
    selectedPathTitle: "Ask Her Out",
    pathText: ["Ask her out directly after work."],
  });

  it("preserves success-criteria Claude explanations unchanged", () => {
    expect(shouldPreserveForecastExplanation(workInitiationWhy)).toBe(true);
    expect(shouldPreserveForecastExplanation(personalityWhy)).toBe(true);

    const preservedWork = resolveForecastExplanation(workInitiationWhy, "She Welcomes More Contact", bundle);
    const preservedPersonality = resolveForecastExplanation(
      personalityWhy,
      "She Says No But Stays Friendly",
      bundle,
    );

    expect(preservedWork.status).toBe("preserved");
    expect(preservedWork.displayedExplanation).toBe(workInitiationWhy);
    expect(preservedPersonality.status).toBe("preserved");
    expect(preservedPersonality.displayedExplanation).toBe(personalityWhy);
  });

  it("rejects template and reflective explanations for preservation", () => {
    expect(
      validateForecastExplanation(
        'Because you described "there a girl i like at work" and chose Ask Her Out, this outcome follows naturally.',
      ).valid,
    ).toBe(false);
    expect(validateForecastExplanation("Gain clarity.").valid).toBe(false);
    expect(validateForecastExplanation("The situation suggests a mixed outcome.").valid).toBe(false);
  });

  it("reconstructs invalid raw explanations instead of preserving them", () => {
    const reconstructed = resolveForecastExplanation("Gain clarity.", "She Says Yes", bundle);

    expect(reconstructed.status).toBe("reconstructed");
    expect(reconstructed.displayedExplanation).toMatch(/^Because you described/i);
  });

  it("falls back when Claude explanation is missing", () => {
    const fallback = resolveForecastExplanation(null, "She Says Yes", bundle);

    expect(fallback.status).toBe("fallback");
    expect(fallback.displayedExplanation).toMatch(/^Because you described/i);
  });

  it("computes explanation preservation metrics", () => {
    const preserved = resolveForecastExplanation(workInitiationWhy, "She Welcomes More Contact", bundle);
    const fallback = resolveForecastExplanation(null, "She Says Yes", bundle);

    const metrics = computeForecastExplanationPreservationMetrics({
      active: [
        {
          section: "active",
          index: 0,
          title: "She Welcomes More Contact",
          rawExplanation: preserved.rawExplanation,
          displayedExplanation: preserved.displayedExplanation,
          status: preserved.status,
        },
        {
          section: "active",
          index: 1,
          title: "She Says Yes",
          rawExplanation: fallback.rawExplanation,
          displayedExplanation: fallback.displayedExplanation,
          status: fallback.status,
        },
      ],
      hidden: [],
      blind_spots: [],
    });

    expect(metrics.preservedExplanations).toBe(1);
    expect(metrics.fallbackExplanations).toBe(1);
    expect(metrics.percentages.preservedExplanations).toBe(50);
    expect(metrics.percentages.fallbackExplanations).toBe(50);
  });
});
