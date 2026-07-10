import { describe, expect, it } from "vitest";

import {
  buildForecastExplanationPreservationAudit,
  computeForecastExplanationPreservationMetrics,
} from "@/lib/forecast-explanation-preservation";
import type { ScannableFuture } from "@/components/home/output-refinement";

// Forecasts v2.2: this module no longer validates or rewrites explanations —
// the model's "why" is carried verbatim (pinned in forecast-reality.test.ts).
// What remains is the audit surface: classifying how a displayed explanation
// was produced, including pre-v2.2 stored rows whose text was reconstructed.

function future(overrides: Partial<ScannableFuture>): ScannableFuture {
  return {
    title: "She Welcomes More Contact",
    whyItMightHappen: "She initiates conversation every time you are both at work.",
    signals: ["Daily conversations continue", "She seeks you out", "Contact grows"],
    futureImpact: "You spend more time together.",
    expansion: null,
    ...overrides,
  };
}

describe("forecast explanation preservation audit", () => {
  it("reports the mapper-recorded status when the trace is present", () => {
    const audit = buildForecastExplanationPreservationAudit({
      activeFutures: [
        future({
          explanationPreservation: {
            rawExplanation: "She initiates conversation every time you are both at work.",
            status: "preserved",
          },
        }),
      ],
      hiddenFutures: [],
      blindSpotFutures: [],
    });

    expect(audit.active[0]?.status).toBe("preserved");
    expect(audit.active[0]?.rawExplanation).toContain("She initiates conversation");
  });

  it("classifies stored template text as fallback for rows without a trace", () => {
    // Pre-v2.2 rows can carry application-written template text with no
    // preservation trace; the audit must still label them honestly.
    const audit = buildForecastExplanationPreservationAudit({
      activeFutures: [
        future({
          whyItMightHappen:
            'Because you described "there a girl i like at work" and chose Ask Her Out, this outcome follows naturally.',
          explanationPreservation: undefined,
        }),
        future({
          title: "A Different Future",
          explanationPreservation: undefined,
        }),
      ],
      hiddenFutures: [],
      blindSpotFutures: [],
    });

    expect(audit.active[0]?.status).toBe("fallback");
    expect(audit.active[1]?.status).toBe("reconstructed");
  });

  it("computes explanation preservation metrics", () => {
    const metrics = computeForecastExplanationPreservationMetrics({
      active: [
        {
          section: "active",
          index: 0,
          title: "She Welcomes More Contact",
          rawExplanation: "She initiates conversation every time you are both at work.",
          displayedExplanation:
            "She initiates conversation every time you are both at work.",
          status: "preserved",
        },
        {
          section: "active",
          index: 1,
          title: "She Says Yes",
          rawExplanation: null,
          displayedExplanation:
            'Because you described "there a girl i like at work", this outcome follows naturally.',
          status: "fallback",
        },
      ],
      hidden: [],
      blind_spots: [],
    });

    expect(metrics.preservedExplanations).toBe(1);
    expect(metrics.fallbackExplanations).toBe(1);
    expect(metrics.percentages.preservedExplanations).toBe(50);
    expect(metrics.percentages.fallbackExplanations).toBe(50);
  });
});
