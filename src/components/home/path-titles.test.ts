import { describe, expect, it } from "vitest";

import {
  assignUniquePathTitles,
  countPathTitleWords,
  formatPathTitle,
  isValidStrategyTitle,
} from "@/components/home/path-titles";

describe("formatPathTitle", () => {
  it("maps verbose descriptions to short decision titles", () => {
    expect(
      formatPathTitle(
        'Move forward with "I moved to Dallas" and commit to seeing it through.',
        ["Courage"],
        0,
      ),
    ).toBe("Take The Leap");

    expect(
      formatPathTitle('Pause on the decision and gather more information before acting.', [
        "Stability",
      ]),
    ).toBe("Wait And Observe");

    expect(formatPathTitle("Stay friendly and keep things platonic at work.", ["Connection"])).toBe(
      "Friendship First",
    );
  });

  it("keeps titles between two and five words without truncation", () => {
    const title = formatPathTitle(
      "You might explore building more frequent one-on-one interactions outside the office.",
      ["Connection"],
      1,
    );

    expect(title).not.toContain("…");
    expect(countPathTitleWords(title)).toBeGreaterThanOrEqual(2);
    expect(countPathTitleWords(title)).toBeLessThanOrEqual(5);
  });

  it("never returns sentence fragment titles", () => {
    expect(
      isValidStrategyTitle("Choose Treat Graduation Launch Window"),
    ).toBe(false);
    expect(isValidStrategyTitle("Launch Now")).toBe(true);
    expect(
      formatPathTitle(
        "Choose to spend a defined period after graduation exploring the launch window alone.",
        ["Growth"],
        0,
        "business",
      ),
    ).toBe("Launch Now");
  });

  it("assigns business-specific strategy titles", () => {
    const titles = assignUniquePathTitles(
      [
        { description: "Launch now and ship the first version quickly.", themes: ["Courage"] },
        { description: "Keep building the product before launching.", themes: ["Stability"] },
        { description: "Find a co-founder to build with.", themes: ["Connection"] },
        { description: "Test with users before committing fully.", themes: ["Curiosity"] },
        { description: "Get a job first and build on the side.", themes: ["Independence"] },
      ],
      "I'm thinking about starting a business",
    );

    expect(new Set(titles).size).toBe(5);
    expect(titles.every((title) => isValidStrategyTitle(title))).toBe(true);
    expect(titles).toContain("Launch Now");
    expect(titles).toContain("Get A Job First");
  });

  it("assigns relocation-specific strategy titles", () => {
    const titles = assignUniquePathTitles(
      [
        { description: "Accept the role in Dallas and relocate.", themes: ["Courage"] },
        { description: "Stay in your current city and pass on the offer.", themes: ["Stability"] },
        { description: "Delay the decision until you know more.", themes: ["Reflection"] },
        { description: "Negotiate remote work or better terms.", themes: ["Independence"] },
        { description: "Look at other roles before deciding.", themes: ["Curiosity"] },
      ],
      "I might get a job in Dallas",
    );

    expect(new Set(titles).size).toBe(5);
    expect(titles.some((title) => /focus on yourself|move on|push forward/i.test(title))).toBe(false);
    expect(titles).toContain("Take The Job");
    expect(titles).toContain("Stay Where You Are");
  });
});
