import { describe, expect, it } from "vitest";

import { processGeneratedForecastSections } from "@/components/home/forecast-reality";

describe("forecast pipeline trace", () => {
  it("records stage-by-stage trace entries when audit collection is enabled", () => {
    const result = processGeneratedForecastSections(
      {
        wild_card: [],
        active: [
          {
            title: "She Says Yes To Coffee",
            why: "A direct ask after daily rapport can lead to plans quickly.",
            impact: "You meet outside work within the week.",
          },
          {
            title: "Gain Clarity",
            why: "Reflection may help you understand your feelings.",
            impact: "You learn more about yourself.",
          },
        ],
        hidden: [
          {
            title: "Feedback Creates Insight",
            why: "Early users may push the product in a new direction.",
            impact: "The MVP targets a different audience.",
          },
        ],
        blind_spots: [
          {
            title: "She Assumes You're Not Interested",
            why: "Platonic behavior can read as disinterest when she initiates often.",
            impact: "She stops looking for signs because the friendship feels settled.",
          },
        ],
      },
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
      { collectPipelineTrace: true },
    );

    expect(result.pipelineTrace).toBeDefined();
    expect(result.pipelineTrace?.active.length).toBeGreaterThanOrEqual(2);
    expect(result.pipelineTrace?.active.some((item) => item.original === "Gain Clarity")).toBe(true);
    // v2.1: AI-generated futures are no longer removed for v1 "reflective
    // language" — the model succeeds or fails on structural correctness.
    // Even a weak title like "Gain Clarity" is preserved verbatim; prose
    // quality is the prompt's job now.
    expect(
      result.pipelineTrace?.active.find((item) => item.original === "Gain Clarity")?.status,
    ).toBe("preserved");
    expect(
      result.pipelineTrace?.active.find((item) => item.original === "She Says Yes To Coffee")?.status,
    ).toBe("preserved");
    expect(result.activeFutures.some((future) => future.title === "She Says Yes To Coffee")).toBe(
      true,
    );
    expect(result.activeFutures.some((future) => future.title === "Gain Clarity")).toBe(true);
    // Sections are no longer padded to their own minimum individually —
    // fallback only tops up the unified, combined list to the global floor.
    const totalFutures =
      result.activeFutures.length +
      result.hiddenFutures.length +
      result.blindSpotFutures.length +
      result.wildCardFutures.length;
    expect(totalFutures).toBeGreaterThanOrEqual(4);
  });
});
