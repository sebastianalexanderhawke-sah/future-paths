import { describe, expect, it } from "vitest";

import { processGeneratedForecastSections } from "@/components/home/forecast-reality";

describe("forecast pipeline trace", () => {
  it("records stage-by-stage trace entries when audit collection is enabled", () => {
    const result = processGeneratedForecastSections(
      {
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
    expect(
      result.pipelineTrace?.active.find((item) => item.original === "Gain Clarity")?.status,
    ).toBe("removed");
    expect(
      result.pipelineTrace?.active.find((item) => item.original === "She Says Yes To Coffee")?.status,
    ).toBe("preserved");
    expect(result.activeFutures.some((future) => future.title === "She Says Yes To Coffee")).toBe(
      true,
    );
    expect(result.activeFutures.length).toBeGreaterThanOrEqual(4);
  });
});
