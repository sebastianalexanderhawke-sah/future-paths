import { describe, expect, it } from "vitest";

import {
  buildRealityForecastSections,
  formatForecastTitle,
  isAbstractCategoryFuture,
  isPhotographableFuture,
  isReflectiveForecast,
  scoreForecastSpecificity,
  withRealityForecastFallbacks,
} from "@/components/home/forecast-reality";

describe("forecast reality", () => {
  it("rejects reflective coaching language", () => {
    expect(isReflectiveForecast("Gain clarity")).toBe(true);
    expect(isReflectiveForecast("Observe more")).toBe(true);
    expect(isReflectiveForecast("You may uncover patterns in the situation")).toBe(true);
    expect(isReflectiveForecast("Strong Social Circle Forms")).toBe(false);
  });

  it("requires photographable futures", () => {
    expect(isPhotographableFuture("She Starts Texting You Outside Work")).toBe(true);
    expect(isPhotographableFuture("Gain clarity")).toBe(false);
    expect(isPhotographableFuture("You may develop understanding over time")).toBe(false);
    expect(isAbstractCategoryFuture("Slow-Build Relationship")).toBe(true);
    expect(isAbstractCategoryFuture("She Starts Texting You Outside Work")).toBe(false);
  });

  it("prefers scene-level futures over abstract categories", () => {
    expect(scoreForecastSpecificity("She Starts Texting You Outside Work")).toBeGreaterThan(
      scoreForecastSpecificity("Slow-Build Relationship"),
    );
    expect(formatForecastTitle("Career growth")).toBe("You Receive A Promotion Within The First Year");
  });

  it("formats outcome-oriented forecast titles", () => {
    expect(formatForecastTitle("slow-build relationship")).toBe("She Starts Texting You Outside Work");
    expect(formatForecastTitle("The Independent Explorer")).toBe("");
  });

  it("grounds relocation futures in the situation instead of inventing hobbies", () => {
    const sections = buildRealityForecastSections(
      [
        {
          description: "Accept the role in Dallas",
          benefits: ["Build a new social circle", "Gain clarity"],
          consequences: ["Temporary loneliness", "Distance from familiar places"],
          future_shift: "You may stay in Dallas longer than expected.",
          themes: ["Growth"],
        },
      ],
      [],
      "I might get a job in Dallas",
    );

    expect(
      sections.activeFutures.every(
        (future) => !/run club|fitness|gym|athletic/i.test(future.title),
      ),
    ).toBe(true);
    expect(sections.activeFutures.length).toBeGreaterThanOrEqual(4);
    expect(sections.hiddenFutures.length).toBeGreaterThanOrEqual(3);
    expect(sections.blindSpotFutures.length).toBeGreaterThanOrEqual(3);
  });

  it("builds specific blind spot futures from selected path context", () => {
    const sections = buildRealityForecastSections(
      [],
      [],
      "I like a girl at work",
      {
        description: "Keep things friendly at work.",
        benefits: ["The friendship grows stronger"],
        consequences: ["She may assume you are not interested"],
        future_shift: "The friendship becomes the primary relationship.",
        themes: ["Connection"],
      },
      "Friendship First",
      "How often does she initiate conversations?\nDaily\n\nHave you spent time together one-on-one?\nNot yet",
    );

    expect(
      sections.blindSpotFutures.some((future) => future.title === "She Assumes You're Not Interested"),
    ).toBe(true);
    expect(
      sections.blindSpotFutures.every(
        (future) => !/clarity|reflect|understanding|patterns|insight/i.test(future.title),
      ),
    ).toBe(true);
  });

  it("uses relationship fallbacks for sparse reflective output", () => {
    const sections = withRealityForecastFallbacks(
      { activeFutures: [], hiddenFutures: [], blindSpotFutures: [] },
      "I like a girl at work",
    );

    expect(sections.activeFutures.length).toBeGreaterThan(0);
    expect(
      sections.activeFutures.some(
        (future) => future.title === "You Keep Talking Every Week But Nothing Changes",
      ),
    ).toBe(true);
    expect(sections.activeFutures[0]?.sourceTrace).toContain("Situation:");
  });
});
