import { describe, expect, it } from "vitest";

import {
  buildForecastSections,
  withForecastFallbacks,
} from "@/components/home/forecast-utils";
import { isReflectiveForecast } from "@/components/home/forecast-reality";
import type { MockCrossroadResult } from "@/lib/mock-crossroad-generator";

const crossroad: MockCrossroadResult = {
  current_understanding: "You are exploring a move.",
  opportunity_themes: [],
  risk_themes: [],
  paths: [
    {
      title: "Take The Job",
      description: "Accept the role in Dallas",
      benefits: ["Build a new social circle", "Career growth"],
      consequences: ["Temporary loneliness", "Distance from familiar places"],
      future_shift: "You may stay in Dallas longer than expected.",
      themes: ["Growth"],
    },
    {
      title: "Delay The Move",
      description: "Delay the move",
      benefits: ["Keep current stability"],
      consequences: ["The opportunity may pass"],
      future_shift: "Home may feel different when you visit.",
      themes: ["Stability"],
    },
    {
      title: "Negotiate Remote Work",
      description: "Negotiate remote work",
      benefits: ["Career growth without relocating"],
      consequences: ["Less immersion in a new city"],
      future_shift: "New hobbies may reshape your identity.",
      themes: ["Independence"],
    },
    {
      title: "Explore Other Cities",
      description: "Path four",
      benefits: ["Benefit four"],
      consequences: ["Consequence four"],
      future_shift: "Shift four",
      themes: ["Connection"],
    },
    {
      title: "Stay Where You Are",
      description: "Path five",
      benefits: ["Benefit five"],
      consequences: ["Consequence five"],
      future_shift: "Shift five",
      themes: ["Courage"],
    },
  ],
};

describe("buildForecastSections", () => {
  it("maps crossroad and future self output into scannable forecast cards", () => {
    const sections = buildForecastSections(
      crossroad,
      [
        {
          name: "Adapts quickly to the new city rather than waiting it out",
          summary: "A version focused on adaptation.",
          movement_direction: "positive",
          evidence_strength: "Moderate",
          core_behaviors: ["Builds new routines quickly after a move."],
          behavioral_evidence: ["Accepted the Dallas role."],
          growth_opportunities: ["Local opportunities open up sooner."],
          blind_spots: ["Old routines and ties may fade."],
          likely_evolution:
            "Becomes someone who treats relocation as routine rather than disruption.",
          themes: ["Growth"],
          why_emerging: "",
        },
      ],
      "I moved to Dallas",
    );

    expect(sections.activeFutures[0]?.title).toBeTruthy();
    expect(sections.activeFutures[0]?.whyItMightHappen.length).toBeGreaterThan(0);
    expect(sections.activeFutures[0]?.signals.length).toBeGreaterThan(0);
    expect(sections.activeFutures[0]?.futureImpact.length).toBeGreaterThan(0);
    expect(sections.activeFutures.every((future) => !isReflectiveForecast(future.title))).toBe(
      true,
    );

    expect(sections.hiddenFutures[0]?.signals.length).toBeGreaterThan(0);
    // Forecasts v2: blind spots retired — path-derived insights surface as
    // failure modes (hidden) instead.
    expect(sections.hiddenFutures[0]?.title).toBeTruthy();
    expect(sections.blindSpotFutures).toHaveLength(0);
  });

  it("fills fallback sections when generation is sparse", () => {
    const sections = withForecastFallbacks(
      { activeFutures: [], hiddenFutures: [], blindSpotFutures: [], wildCardFutures: [] },
      "I moved to Dallas",
    );

    expect(sections.activeFutures[0]?.signals.length).toBeGreaterThanOrEqual(3);
    expect(sections.hiddenFutures[0]?.futureImpact.length).toBeGreaterThan(0);
    expect(sections.activeFutures.length).toBeGreaterThanOrEqual(3);
    expect(sections.activeFutures.some((future) => future.title === "Most Of Your New Friends Come From Work")).toBe(
      true,
    );
  });
});
