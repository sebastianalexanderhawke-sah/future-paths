import { describe, expect, it } from "vitest";

import type { EmergingSituationResult } from "@/lib/ai/schemas/emerging-situation";
import {
  MIN_CHECK_INS_FOR_EMERGING_DETECTION,
  shouldSurfaceEmergingSituation,
} from "@/lib/emerging-situation";

// The surfacing gate is the product rule "do not show low-confidence
// suggestions" made executable — these tests pin it.

function makeResult(
  overrides: Partial<EmergingSituationResult> = {},
): EmergingSituationResult {
  return {
    new_story_detected: true,
    confidence: "high",
    suggested_title: "Caring for Dad after his diagnosis",
    suggested_description:
      "My dad was diagnosed last month and I've become his main support.",
    ...overrides,
  };
}

describe("shouldSurfaceEmergingSituation", () => {
  it("surfaces only a high-confidence detection", () => {
    expect(shouldSurfaceEmergingSituation(makeResult())).toBe(true);
  });

  it("never surfaces medium or low confidence", () => {
    expect(shouldSurfaceEmergingSituation(makeResult({ confidence: "medium" }))).toBe(
      false,
    );
    expect(shouldSurfaceEmergingSituation(makeResult({ confidence: "low" }))).toBe(
      false,
    );
  });

  it("never surfaces a non-detection, whatever the confidence", () => {
    expect(
      shouldSurfaceEmergingSituation(
        makeResult({
          new_story_detected: false,
          confidence: "high",
          suggested_title: null,
          suggested_description: null,
        }),
      ),
    ).toBe(false);
  });

  it("requires both suggestion fields to be non-blank", () => {
    expect(
      shouldSurfaceEmergingSituation(makeResult({ suggested_title: "  " })),
    ).toBe(false);
    expect(
      shouldSurfaceEmergingSituation(makeResult({ suggested_description: null })),
    ).toBe(false);
  });
});

describe("detection gating", () => {
  it("requires enough check-ins to call anything 'consistent'", () => {
    expect(MIN_CHECK_INS_FOR_EMERGING_DETECTION).toBeGreaterThanOrEqual(3);
  });
});
