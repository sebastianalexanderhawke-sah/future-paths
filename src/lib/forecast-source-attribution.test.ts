import { describe, expect, it } from "vitest";

import { processGeneratedForecastSections } from "@/components/home/forecast-reality";
import {
  buildForecastSourceAttributionAudit,
  computeForecastSourceMetrics,
  computeForecastSourceMetricsFromSections,
  tagForecastFuture,
  toForecastSourceAttribution,
} from "@/lib/forecast-source-attribution";

describe("forecast source attribution", () => {
  it("builds attribution items from scannable futures", () => {
    const future = tagForecastFuture(
      {
        title: "She Says Yes To Coffee",
        whyItMightHappen: "A direct ask can lead to plans quickly.",
        signals: ["Direct ask"],
        futureImpact: "You meet outside work within the week.",
        expansion: null,
      },
      "claude",
      "generation",
      "She Says Yes To Coffee",
    );

    expect(toForecastSourceAttribution(future)).toEqual({
      title: "She Says Yes To Coffee",
      source: "claude",
      sourceStage: "generation",
      originalTitle: "She Says Yes To Coffee",
    });
  });

  it("computes source metrics with percentages", () => {
    const metrics = computeForecastSourceMetrics([
      {
        title: "One",
        source: "claude",
        sourceStage: "generation",
        originalTitle: "One",
      },
      {
        title: "Two",
        source: "claude",
        sourceStage: "generation",
        originalTitle: "Two",
      },
      {
        title: "Three",
        source: "fallback",
        sourceStage: "fallback",
        originalTitle: null,
      },
    ]);

    expect(metrics.total).toBe(3);
    expect(metrics.claude).toBe(2);
    expect(metrics.fallback).toBe(1);
    expect(metrics.percentages.claude).toBe(67);
    expect(metrics.percentages.fallback).toBe(33);
    expect(metrics.percentages.unknown).toBe(0);
  });

  it("tags surviving Claude futures during forecast processing", () => {
    const generated = {
      active: [
        {
          title: "She Says Yes To Coffee",
          why: "A direct ask after daily rapport can lead to plans quickly.",
          impact: "You meet outside work within the week.",
        },
        {
          title: "She Declines But Stays Warm",
          why: "A clear question can keep the friendship workable.",
          impact: "Daily work stays friendly even if romance fades.",
        },
        {
          title: "The Ask Happens Over Lunch",
          why: "A low-pressure lunch invite can feel natural at work.",
          impact: "The conversation moves outside the office routine.",
        },
        {
          title: "She Asks A Clarifying Question",
          why: "Mixed signals can prompt her to test interest directly.",
          impact: "You know where you stand sooner.",
        },
        {
          title: "A First Date Gets Planned",
          why: "Mutual interest often turns into concrete plans quickly.",
          impact: "You meet outside work within days.",
        },
      ],
      hidden: [
        {
          title: "Coworkers Notice The Dynamic",
          why: "Workplace chemistry rarely stays invisible.",
          impact: "Small talk feels different for a few weeks.",
        },
      ],
      blind_spots: [
        {
          title: "She Assumes You're Not Interested",
          why: "Platonic behavior can read as disinterest when she initiates often.",
          impact: "She stops looking for signs because the friendship feels settled.",
        },
      ],
    };

    const result = processGeneratedForecastSections(
      generated,
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
    );

    const audit = buildForecastSourceAttributionAudit(result);
    const metrics = computeForecastSourceMetricsFromSections(result);

    expect(audit.active.filter((item) => item.source === "claude").length).toBe(4);
    expect(audit.active.find((item) => item.source === "recovery")).toEqual({
      title: "She Starts Texting You Outside Work",
      source: "recovery",
      sourceStage: "recovery",
      originalTitle: null,
    });
    expect(metrics.claude).toBeGreaterThan(0);
    expect(metrics.recovery).toBeGreaterThan(0);
    expect(metrics.percentages.claude + metrics.percentages.recovery).toBe(100);
  });
});
