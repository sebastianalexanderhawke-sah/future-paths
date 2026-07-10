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
          title: "The Ask Happens Over Lunch",
          why: "A low-pressure lunch invite can feel natural at work.",
          impact: "The conversation moves outside the office routine.",
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
        {
          title: "She Assumes You're Not Interested",
          why: "Platonic behavior can read as disinterest when she initiates often.",
          impact: "She stops looking for signs because the friendship feels settled.",
        },
        {
          title: "The Timing Never Aligns",
          why: "Busy schedules can keep things polite but static.",
          impact: "Months pass without a clear moment to act.",
        },
      ],
      blind_spots: [],
      wild_card: [
        {
          title: "She Transfers To Another Team",
          why: "Internal moves change daily proximity without ending contact.",
          impact: "You have to choose to stay in touch deliberately.",
        },
        {
          title: "A Mutual Friend Changes The Dynamic",
          why: "Shared social ties can shift how you both act at work.",
          impact: "Group plans replace one-on-one contact.",
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

    // All 3 active inputs survive the reality filter as claude-sourced futures.
    // "The Ask Happens Over Lunch" was previously dropped by the over-broad
    // FUTURE_IDENTITY_NAME_PATTERN and replaced by a recovery slot; the fixed pattern
    // lets it pass through correctly.
    expect(audit.active.filter((item) => item.source === "claude").length).toBe(3);
    expect(audit.active.find((item) => item.source === "recovery")).toBeUndefined();
    expect(metrics.claude).toBeGreaterThan(0);
    expect(metrics.recovery).toBe(0);
    expect(metrics.percentages.claude).toBeGreaterThan(0);
  });
});
