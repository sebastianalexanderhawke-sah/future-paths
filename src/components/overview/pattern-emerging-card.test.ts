import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PatternEmergingCard } from "@/components/overview/pattern-emerging-card";
import type { FocusArea } from "@/lib/focus-areas";
import type { FutureSelf } from "@/types/database";

// Behavioral tests: render the card with fixture data and assert on the
// story a user reads — pattern, trajectory, where attention went — and on
// what the redesigns removed (evidence meters, impact percentages, source
// bookkeeping).

function makeFutureSelf(overrides: Partial<FutureSelf> = {}): FutureSelf {
  return {
    id: "future-1",
    name: "The Self-Made Navigator",
    summary:
      "You keep choosing unfamiliar ground over safe routines. It shows up in how you decide, not just what you decide.",
    why_emerging: "You acted before feeling ready in three recent situations.",
    percentage: 48,
    previous_percentage: 40,
    ...overrides,
  } as FutureSelf;
}

function makeFocusAreas(): FocusArea[] {
  return [
    { theme: "Courage", weight: 1, mentions: 5 },
    { theme: "Connection", weight: 0.6, mentions: 3 },
    { theme: "Stability", weight: 0.4, mentions: 2 },
    { theme: "Uncertainty", weight: 0.2, mentions: 1 },
  ];
}

function render(
  futureSelf: FutureSelf = makeFutureSelf(),
  focusAreas: FocusArea[] = makeFocusAreas(),
): string {
  return renderToStaticMarkup(
    createElement(PatternEmergingCard, { futureSelf, focusAreas }),
  );
}

describe("PatternEmergingCard story structure", () => {
  it("reads pattern → momentum → your focus", () => {
    const html = render();
    const pattern = html.indexOf("The Self-Made Navigator");
    const momentum = html.indexOf("Momentum");
    const focus = html.indexOf("Your Focus");
    expect(pattern).toBeGreaterThan(-1);
    expect(momentum).toBeGreaterThan(pattern);
    expect(focus).toBeGreaterThan(momentum);
  });

  it("describes the pattern in one sentence", () => {
    const html = render();
    expect(html).toContain(
      "You keep choosing unfamiliar ground over safe routines.",
    );
    expect(html).not.toContain("not just what you decide");
  });

  it("speaks momentum as a human trajectory, not a percentage", () => {
    const html = render();
    expect(html).toContain("Accelerating");
    expect(html).toContain("▲");
    expect(html).not.toContain("+8%");
    expect(html).not.toContain("48%");
  });

  it("adapts the trajectory to the trend", () => {
    expect(render(makeFutureSelf({ percentage: 40 }))).toContain("Holding steady");
    expect(render(makeFutureSelf({ percentage: 30 }))).toContain("Fading");
    expect(
      render(makeFutureSelf({ previous_percentage: null })),
    ).toContain("Just emerging");
  });
});

describe("PatternEmergingCard your focus", () => {
  it("lists the areas strongest-first with bars sized by relative attention", () => {
    const html = render();
    const courage = html.indexOf("Courage");
    const connection = html.indexOf("Connection");
    const uncertainty = html.indexOf("Uncertainty");
    expect(courage).toBeGreaterThan(-1);
    expect(connection).toBeGreaterThan(courage);
    expect(uncertainty).toBeGreaterThan(connection);

    // weight 1 → full bar; weight 0.2 → small but never invisible.
    expect(html).toContain("width:100%");
    expect(html).toContain("width:30%");
  });

  it("shows visible words, not visible numbers", () => {
    const html = render();
    // Counts live only in accessible labels, never as visible copy.
    expect(html).toContain("5 recent moments of attention");
    expect(html).not.toMatch(/>\s*\d+\s*</);
  });

  it("renders only the areas that exist — no filler", () => {
    const two = render(makeFutureSelf(), [
      { theme: "Courage", weight: 1, mentions: 2 },
      { theme: "Growth", weight: 0.5, mentions: 1 },
    ]);
    expect(two).toContain("Courage");
    expect(two).toContain("Growth");
    expect(two).not.toContain("Stability");
  });

  it("stays honest when there is nothing recent to tally", () => {
    const html = render(makeFutureSelf(), []);
    expect(html).toContain("Not enough recent entries");
  });
});

describe("PatternEmergingCard removed analytics", () => {
  it("no longer renders evidence meters, impact deltas, or activity feed", () => {
    const html = render();
    expect(html).not.toContain("Evidence");
    expect(html).not.toContain("Influencing");
    expect(html).not.toContain("Recent Activity");
    expect(html).not.toContain("Checked in on");
  });

  it("keeps purple as the only accent — no movement colors", () => {
    const html = render();
    expect(html).not.toContain("#10b981");
    expect(html).not.toContain("#f43f5e");
    expect(html).toContain("139,92,246"); // the translucent violet surface
  });
});
