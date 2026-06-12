import { describe, expect, it } from "vitest";

import { forecastOutputSchema, parseForecastOutput } from "@/lib/ai/schemas/forecast";

describe("forecast schema", () => {
  it("parses dedicated forecast generation output", () => {
    const parsed = parseForecastOutput({
      active: [
        {
          title: "She Says Yes To Coffee",
          why: "A direct ask after daily rapport can lead to plans quickly.",
          impact: "You meet outside work within the week.",
        },
      ],
      hidden: [
        {
          title: "The Message Goes Unanswered",
          why: "Timing or interest may not align when you reach out.",
          impact: "You stop expecting a reply after several days.",
        },
      ],
      blind_spots: [
        {
          title: "A Coworker Makes A Move First",
          why: "Shared shifts put others in the same position.",
          impact: "She starts spending breaks with someone else.",
        },
      ],
    });

    expect(parsed.active[0]?.title).toBe("She Says Yes To Coffee");
    expect(forecastOutputSchema.safeParse(parsed).success).toBe(true);
  });
});
