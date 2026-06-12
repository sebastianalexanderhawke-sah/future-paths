import { describe, expect, it } from "vitest";

import {
  buildRawForecastAudit,
  toProcessedForecastAudit,
  toRawPathAudit,
} from "@/lib/ai-audit";

describe("ai audit", () => {
  it("captures raw path fields before post-processing", () => {
    expect(
      toRawPathAudit({
        description: "Launch now and ship quickly.",
        benefits: ["Early users arrive"],
        consequences: ["Launch slips"],
        future_shift: "The product becomes your main focus.",
        themes: ["Courage"],
      }),
    ).toEqual({
      description: "Launch now and ship quickly.",
      benefits: ["Early users arrive"],
      consequences: ["Launch slips"],
      future_shift: "The product becomes your main focus.",
      themes: ["Courage"],
    });
  });

  it("maps crossroad generation into raw forecast sections", () => {
    const raw = buildRawForecastAudit(
      {
        current_understanding: "You are starting a business.",
        paths: [
          {
            description: "Launch now.",
            benefits: ["First users arrive"],
            consequences: ["Competitor launches first"],
            future_shift: "Building becomes your daily routine.",
            themes: ["Courage"],
          },
        ],
      },
      [
        {
          name: "The Builder",
          description: "You may become someone who ships consistently.",
          stage: "emerging",
          momentum: 40,
          themes: ["Growth"],
        },
      ],
    );

    expect(raw.active).toEqual([{ title: "First users arrive", futureImpact: "First users arrive" }]);
    expect(raw.hidden).toEqual([
      { title: "Competitor launches first", futureImpact: "Competitor launches first" },
    ]);
    expect(raw.blind_spots.length).toBe(2);
  });

  it("captures processed forecast sections for comparison", () => {
    const processed = toProcessedForecastAudit({
      activeFutures: [
        {
          title: "First Users Arrive",
          whyItMightHappen: "Launch timing creates early traction.",
          signals: ["Launch date", "User interest"],
          futureImpact: "The first ten users show up within weeks.",
          expansion: null,
        },
      ],
      hiddenFutures: [],
      blindSpotFutures: [],
    });

    expect(processed.active[0]?.title).toBe("First Users Arrive");
    expect(processed.hidden).toEqual([]);
    expect(processed.blind_spots).toEqual([]);
  });
});
