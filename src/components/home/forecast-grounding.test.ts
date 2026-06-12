import { describe, expect, it } from "vitest";

import {
  buildGroundingBundle,
  isGroundedFutureText,
  mentionsInventedTopic,
  pickGroundedSocialCircleTitle,
  scoreSourceGrounding,
} from "@/components/home/forecast-grounding";

describe("forecast grounding", () => {
  it("rejects invented run club futures when running was never mentioned", () => {
    const bundle = buildGroundingBundle({
      situationTitle: "I might get a job in Dallas",
      contextSummary: "Would you move alone?\nYes",
      selectedPathTitle: "Take The Job",
    });

    expect(mentionsInventedTopic("The Run Club Becomes Your Main Friend Group", bundle)).toBe(true);
    expect(isGroundedFutureText("The Run Club Becomes Your Main Friend Group", bundle)).toBe(false);
    expect(pickGroundedSocialCircleTitle(bundle)).toBe("Most Of Your New Friends Come From Work");
    expect(isGroundedFutureText(pickGroundedSocialCircleTitle(bundle), bundle)).toBe(true);
  });

  it("allows run club futures when running is mentioned in the source bundle", () => {
    const bundle = buildGroundingBundle({
      situationTitle: "I might get a job in Dallas and join a run club",
      contextSummary: null,
      selectedPathTitle: "Take The Job",
    });

    expect(isGroundedFutureText("The Run Club Becomes Your Main Friend Group", bundle)).toBe(true);
    expect(scoreSourceGrounding("The Run Club Becomes Your Main Friend Group", bundle)).toBeGreaterThan(0);
  });
});
