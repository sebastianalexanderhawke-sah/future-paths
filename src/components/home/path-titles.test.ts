import { describe, expect, it } from "vitest";

import {
  encodePathDescriptionWithNativeTitle,
  decodeNativePathFields,
} from "@/components/home/path-native-title";
import {
  assignUniquePathTitles,
  assignUniquePathTitlesWithTrace,
  countPathTitleWords,
  formatPathTitle,
  isNativePathTitle,
  isValidStrategyTitle,
  validateNativePathTitle,
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

  it("keeps titles between two and six words without truncation", () => {
    const title = formatPathTitle(
      "You might explore building more frequent one-on-one interactions outside the office.",
      ["Connection"],
      1,
    );

    expect(title).not.toContain("…");
    expect(countPathTitleWords(title)).toBeGreaterThanOrEqual(2);
    expect(countPathTitleWords(title)).toBeLessThanOrEqual(6);
  });

  it("uses native Claude titles directly without description extraction", () => {
    expect(isNativePathTitle("Ask Her Out")).toBe(true);
    expect(validateNativePathTitle("Tell Her Directly And Honestly That").valid).toBe(false);
    expect(validateNativePathTitle("Keep The Relationship Strictly Professional And").valid).toBe(
      false,
    );

    const { titles, traces } = assignUniquePathTitlesWithTrace(
      [
        { description: "Be direct after work.", themes: ["Courage"] },
        { description: "Stay friendly at work.", themes: ["Connection"] },
        { description: "Redirect energy elsewhere.", themes: ["Independence"] },
      ].map((path, index) => ({
        description: encodePathDescriptionWithNativeTitle(
          ["Ask Her Out", "Friendship First", "Move On"][index]!,
          path.description,
        ),
        themes: path.themes,
      })),
      "I like a girl at work",
    );

    expect(titles).toContain("Ask Her Out");
    expect(titles).toContain("Friendship First");
    expect(traces.filter((trace) => trace.status === "native").length).toBe(3);
  });

  it("falls back when native titles fail validation instead of blocking generation", () => {
    const { titles, traces } = assignUniquePathTitlesWithTrace(
      [
        {
          description: encodePathDescriptionWithNativeTitle(
            "Take The Opportunity And Move Forward Now",
            "Accept the role and relocate soon.",
          ),
          themes: ["Courage"],
        },
        {
          description: encodePathDescriptionWithNativeTitle(
            "Launch",
            "You might launch now and ship the first version quickly.",
          ),
          themes: ["Growth"],
        },
        {
          description: encodePathDescriptionWithNativeTitle(
            "See What Happens",
            "You might pause and gather more information before acting.",
          ),
          themes: ["Stability"],
        },
      ],
      "I'm thinking about starting a business",
    );

    expect(validateNativePathTitle("Take The Opportunity And Move Forward Now").valid).toBe(false);
    expect(traces[0]?.validationResult.valid).toBe(false);
    expect(traces[0]?.fallbackTitle).toBe("Take The Opportunity And Move Forward");
    expect(titles[0]).toBe("Take The Opportunity And Move Forward");
    expect(traces[1]?.status).toBe("recovered");
    expect(traces[2]?.status).toBe("recovered");
    expect(titles.every((title) => isValidStrategyTitle(title))).toBe(true);
  });

  it("round-trips native titles through stored descriptions", () => {
    const stored = encodePathDescriptionWithNativeTitle(
      "Launch The MVP",
      "Ship a small first version quickly.",
    );

    expect(decodeNativePathFields(stored)).toEqual({
      nativeTitle: "Launch The MVP",
      description: "Ship a small first version quickly.",
    });
  });

  it("never returns sentence fragment titles", () => {
    expect(isValidStrategyTitle("Choose Treat Graduation Launch Window")).toBe(false);
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

  it("assigns business-specific strategy titles when native titles are missing", () => {
    const titles = assignUniquePathTitles(
      [
        {
          description: "You might launch now and ship the first version quickly.",
          themes: ["Courage"],
        },
        {
          description: "You might keep building the product before launching.",
          themes: ["Stability"],
        },
        {
          description: "You might find a co-founder to build with.",
          themes: ["Connection"],
        },
        {
          description: "You might test with users before committing fully.",
          themes: ["Curiosity"],
        },
        {
          description: "You might get a job first and build on the side.",
          themes: ["Independence"],
        },
      ],
      "I'm thinking about starting a business",
    );

    expect(new Set(titles).size).toBe(5);
    expect(titles.every((title) => isValidStrategyTitle(title))).toBe(true);
    expect(titles).toContain("Launch Now");
    expect(titles).toContain("Get A Job First");
  });

  it("assigns relocation-specific strategy titles when native titles are missing", () => {
    const titles = assignUniquePathTitles(
      [
        {
          description: "You might accept the role in Dallas and relocate.",
          themes: ["Courage"],
        },
        {
          description: "You might stay in your current city and pass on the offer.",
          themes: ["Stability"],
        },
        {
          description: "You might delay the decision until you know more.",
          themes: ["Reflection"],
        },
        {
          description: "You might negotiate remote work or better terms.",
          themes: ["Independence"],
        },
        {
          description: "You might look at other roles before deciding.",
          themes: ["Curiosity"],
        },
      ],
      "I might get a job in Dallas",
    );

    expect(new Set(titles).size).toBe(5);
    expect(titles.some((title) => /focus on yourself|move on|push forward/i.test(title))).toBe(false);
    expect(titles).toContain("Take The Job");
    expect(titles).toContain("Stay Where You Are");
  });
});
