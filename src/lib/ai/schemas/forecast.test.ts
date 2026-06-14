import { describe, expect, it } from "vitest";

import { forecastOutputSchema, parseForecastOutput } from "@/lib/ai/schemas/forecast";

const VALID_ITEM_A = {
  title: "She Says Yes To Coffee",
  why: "A direct ask after daily rapport can lead to plans quickly.",
  impact: "You meet outside work within the week.",
  signals: ["Direct ask made after work", "Daily rapport established", "Plans set within the week"],
};

const VALID_ITEM_B = {
  title: "The Message Goes Unanswered",
  why: "Timing or interest may not align when you reach out.",
  impact: "You stop expecting a reply after several days.",
  signals: ["Message sent without reply", "Several days have passed", "Expectation of reply fades"],
};

const VALID_ITEM_C = {
  title: "A Coworker Makes A Move First",
  why: "Shared shifts put others in the same position.",
  impact: "She starts spending breaks with someone else.",
  signals: ["Shared shift patterns overlap", "Break time spent together", "Coworker showing interest"],
};

describe("forecast schema", () => {
  it("parses dedicated forecast generation output", () => {
    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("parsed forecast item includes a signals array of length 3", () => {
    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active[0]?.signals).toBeDefined();
    expect(parsed.active[0]?.signals).toHaveLength(3);
    expect(parsed.active[0]?.signals?.[0]).toBe("Direct ask made after work");
  });

  it("drops items with missing signals", () => {
    const noSignals = {
      title: "She Leaves The Team",
      why: "Job changes happen without warning.",
      impact: "Daily contact ends.",
    };

    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A, noSignals],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active).toHaveLength(1);
    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
  });

  it("drops items with wrong-length signals (not exactly 3)", () => {
    const oneSignal = {
      title: "She Texts First",
      why: "Initiative often comes from genuine interest.",
      impact: "Plans follow quickly.",
      signals: ["Only one signal"],
    };
    const fiveSignals = {
      title: "She Accepts The Invite",
      why: "A clear ask makes it easy to say yes.",
      impact: "You spend time together outside work.",
      signals: ["Signal one", "Signal two", "Signal three", "Signal four", "Signal five"],
    };

    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A, oneSignal, fiveSignals],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.active).toHaveLength(1);
    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
  });

  it("sanitizes directive language in items without dropping them", () => {
    const withBannedWhy = {
      title: "Talk It Over",
      why: "You should talk to her about how you feel.",
      impact: "You meet outside work within the week.",
      signals: ["Honest conversation scheduled", "Feelings expressed directly", "Outcome becomes clear"],
    };

    const parsed = parseForecastOutput({
      active: [
        VALID_ITEM_A,
        {
          title: "She Leaves The Team",
          why: "Job changes happen.",
          impact: "Daily contact ends.",
          signals: ["Job posting noticed online", "Resignation handed in", "Last day approaches"],
        },
        {
          title: "You Get Coffee",
          why: "A casual invite may land well.",
          impact: "Plans happen quickly.",
          signals: ["Casual invite extended", "Nearby coffee spot chosen", "Time slot agreed on"],
        },
        {
          title: "Timing Slips",
          why: "Busy weeks can delay the moment.",
          impact: "Months pass quietly.",
          signals: ["Busy week starts again", "Planned moment delayed", "Calendar stays full"],
        },
        withBannedWhy,
      ],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    // Item is sanitized and kept — all 5 survive.
    expect(parsed.active).toHaveLength(5);
    // Banned phrase removed; sentence re-capitalised at the start.
    expect(parsed.active[4]?.why).toBe("Talk to her about how you feel.");
    expect(parsed.active.every((item) => !item.why.toLowerCase().includes("you should"))).toBe(true);
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("sanitizes directive language across all items in a section", () => {
    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A],
      hidden: [
        {
          title: "First Hidden",
          why: "You must act now.",
          impact: "Something shifts.",
          signals: ["Deadline arrives soon", "Window closing fast", "Decision point reached"],
        },
        {
          title: "Second Hidden",
          why: "You need to tell her.",
          impact: "Things become clear.",
          signals: ["Unsaid feelings build", "Natural moment appears", "Clarity needed soon"],
        },
        {
          title: "Third Hidden",
          why: "You have to decide.",
          impact: "The moment passes.",
          signals: ["Decision point arrives", "Options become fewer", "Moment of choice here"],
        },
      ],
      blind_spots: [VALID_ITEM_C],
    });

    // All three items are sanitized and preserved — the section is no longer empty.
    expect(parsed.hidden).toHaveLength(3);
    expect(parsed.hidden[0]?.why).toBe("Act now.");
    expect(parsed.hidden[1]?.why).toBe("Tell her.");
    expect(parsed.hidden[2]?.why).toBe("Decide.");
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("parses a fully valid forecast without regression", () => {
    const input = {
      active: [
        VALID_ITEM_A,
        {
          title: "She Leaves The Team",
          why: "Job changes happen without warning.",
          impact: "Daily contact ends.",
          signals: ["Job posting noticed online", "Resignation handed in", "Last day approaches"],
        },
      ],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    };

    const parsed = parseForecastOutput(input);

    expect(parsed.active).toHaveLength(2);
    expect(parsed.hidden).toHaveLength(1);
    expect(parsed.blind_spots).toHaveLength(1);
    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });
});
