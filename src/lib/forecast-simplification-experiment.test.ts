import { describe, expect, it } from "vitest";

import {
  buildForecastSimplificationExperiment,
  countCurrentFutureCharacters,
  countSimplifiedFutureCharacters,
  toCurrentFutureRendering,
  toSimplifiedFutureRendering,
} from "@/lib/forecast-simplification-experiment";

describe("forecast simplification experiment", () => {
  it("counts raw Claude characters from title, why, and impact only", () => {
    const rawCharacters = countSimplifiedFutureCharacters(
      toSimplifiedFutureRendering({
        title: "She Says Yes",
        whyItMightHappen: "Daily rapport makes a direct ask feel natural.",
        futureImpact: "You meet outside work within the week.",
      }),
    );

    expect(rawCharacters).toBe(
      "She Says YesDaily rapport makes a direct ask feel natural.You meet outside work within the week."
        .length,
    );
  });

  it("separates displayed, signal, and trace characters for current rendering", () => {
    const counts = countCurrentFutureCharacters(
      toCurrentFutureRendering({
        title: "Months Pass Without Contact",
        whyItMightHappen: "Busy schedules can keep things polite but static.",
        signals: ["Limited overlap", "No direct move"],
        sourceTrace: 'Situation: "I like a girl at work" | Path: Ask Her Out',
        futureImpact: "The crush fades into background routine.",
        expansion: null,
      }),
    );

    expect(counts.signalCharacters).toBe("Limited overlapNo direct move".length);
    expect(counts.traceCharacters).toBe(
      'Situation: "I like a girl at work" | Path: Ask Her Out'.length,
    );
    expect(counts.displayedCharacters).toBeGreaterThan(counts.signalCharacters);
  });

  it("builds side-by-side audit items with character delta", () => {
    const experiment = buildForecastSimplificationExperiment({
      rawForecast: {
        active: [
          {
            title: "She Says Yes To Coffee",
            whyItMightHappen: "A direct ask after daily rapport can lead to plans quickly.",
            futureImpact: "You meet outside work within the week.",
          },
        ],
        hidden: [],
        blind_spots: [],
      },
      sections: {
        activeFutures: [
          {
            title: "She Says Yes To Coffee",
            whyItMightHappen: "Because you described the situation and chose Ask Her Out, rapport builds.",
            signals: ["Daily contact", "Direct ask", "Shared break"],
            sourceTrace: 'Situation: "I like a girl at work" | Path: Ask Her Out',
            futureImpact: "You meet outside work within the week.",
            expansion: null,
            originalTitle: "She Says Yes To Coffee",
          },
        ],
        hiddenFutures: [],
        blindSpotFutures: [],
      },
    });

    const item = experiment.audit.active[0];
    expect(item?.hasRawClaude).toBe(true);
    expect(item?.raw?.whyItMightHappen).toBe(
      "A direct ask after daily rapport can lead to plans quickly.",
    );
    expect(item?.characterDelta).toBeGreaterThan(0);
    expect(experiment.metrics.displayExpansionRatio).toBeGreaterThan(100);
    expect(experiment.metrics.signalCharacters).toBeGreaterThan(0);
    expect(experiment.metrics.traceCharacters).toBeGreaterThan(0);
  });
});
