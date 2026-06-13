import { describe, expect, it } from "vitest";

import {
  buildForecastSections,
  withForecastFallbacks,
} from "@/components/home/forecast-utils";
import { isReflectiveForecast } from "@/components/home/forecast-reality";

const crossroad = {
  current_understanding: "You are exploring a move.",
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
} as const;

describe("buildForecastSections", () => {
  it("maps crossroad and future self output into scannable forecast cards", () => {
    const sections = buildForecastSections(
      crossroad,
      [
        {
          name: "The Independent Explorer",
          description: "A version focused on adaptation.",
          stage: "emerging",
          momentum: 72,
          themes: ["Growth"],
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
    expect(sections.blindSpotFutures[0]?.title).toBeTruthy();
  });

  it("fills fallback sections when generation is sparse", () => {
    const sections = withForecastFallbacks(
      { activeFutures: [], hiddenFutures: [], blindSpotFutures: [] },
      "I moved to Dallas",
    );

    expect(sections.activeFutures[0]?.signals.length).toBeGreaterThanOrEqual(3);
    expect(sections.hiddenFutures[0]?.futureImpact.length).toBeGreaterThan(0);
    expect(sections.activeFutures.length).toBeGreaterThanOrEqual(4);
    expect(sections.activeFutures.some((future) => future.title === "Most Of Your New Friends Come From Work")).toBe(
      true,
    );
  });
});
