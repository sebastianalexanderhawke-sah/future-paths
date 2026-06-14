import { describe, expect, it } from "vitest";

import { forecastOutputSchema, parseForecastOutput } from "@/lib/ai/schemas/forecast";

const VALID_ITEM_A = {
  title: "She Says Yes To Coffee",
  why: "A direct ask after daily rapport can lead to plans quickly.",
  impact: "You meet outside work within the week.",
};

const VALID_ITEM_B = {
  title: "The Message Goes Unanswered",
  why: "Timing or interest may not align when you reach out.",
  impact: "You stop expecting a reply after several days.",
};

const VALID_ITEM_C = {
  title: "A Coworker Makes A Move First",
  why: "Shared shifts put others in the same position.",
  impact: "She starts spending breaks with someone else.",
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

  it("drops a single invalid item without throwing, keeping the rest", () => {
    const banned = {
      title: "Talk It Over",
      why: "You should talk to her about how you feel.",
      impact: "You meet outside work within the week.",
    };

    const parsed = parseForecastOutput({
      active: [
        VALID_ITEM_A,
        { title: "She Leaves The Team", why: "Job changes happen.", impact: "Daily contact ends." },
        { title: "You Get Coffee", why: "A casual invite may land well.", impact: "Plans happen quickly." },
        { title: "Timing Slips", why: "Busy weeks can delay the moment.", impact: "Months pass quietly." },
        banned,
      ],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    });

    expect(() => parseForecastOutput({
      active: [VALID_ITEM_A, banned],
      hidden: [VALID_ITEM_B],
      blind_spots: [VALID_ITEM_C],
    })).not.toThrow();

    expect(parsed.active).toHaveLength(4);
    expect(parsed.active.every((item) => !item.why.toLowerCase().includes("you should"))).toBe(true);
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("returns an empty array when all items in a section are invalid", () => {
    const parsed = parseForecastOutput({
      active: [VALID_ITEM_A],
      hidden: [
        { title: "First Hidden", why: "You must act now.", impact: "Something shifts." },
        { title: "Second Hidden", why: "You need to tell her.", impact: "Things become clear." },
        { title: "Third Hidden", why: "You have to decide.", impact: "The moment passes." },
      ],
      blind_spots: [VALID_ITEM_C],
    });

    expect(parsed.hidden).toHaveLength(0);
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });

  it("parses a fully valid forecast without regression", () => {
    const input = {
      active: [
        VALID_ITEM_A,
        { title: "She Leaves The Team", why: "Job changes happen without warning.", impact: "Daily contact ends." },
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
