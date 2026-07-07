import { describe, expect, it } from "vitest";

import { getFadeStory, getMovementStory } from "@/lib/future-self-story";
import type { FutureSelf, FutureSelfEvent } from "@/types/database";

function makeFuture(overrides: Partial<FutureSelf>): FutureSelf {
  return {
    id: "fs-1",
    user_id: "u-1",
    name: "Adaptive Explorer",
    summary: "Pursues unfamiliar ideas readily.",
    percentage: 24,
    previous_percentage: 18,
    evidence_strength: "emerging" as FutureSelf["evidence_strength"],
    core_behaviors: [],
    behavioral_evidence: [],
    growth_opportunities: [],
    blind_spots: [],
    likely_evolution: "",
    themes: [],
    why_emerging: "Recent curiosity-driven choices",
    status: "active" as FutureSelf["status"],
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    identity_id: "adaptive-explorer",
    confidence: 0.6,
    dimension_breakdown: null,
    supporting_observations: null,
    supporting_situations: null,
    opposing_observations: null,
    narrative_source: "ai",
    narrative_evidence_strength: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<FutureSelfEvent>): FutureSelfEvent {
  return {
    id: "ev-1",
    user_id: "u-1",
    future_self_id: "fs-1",
    event_type: "emerged",
    percentage_before: null,
    percentage_after: 12,
    summary: "",
    created_at: "2026-05-01T00:00:00Z",
    ...overrides,
  } as FutureSelfEvent;
}

describe("getMovementStory", () => {
  it("returns null when there is no previous percentage or no change", () => {
    expect(getMovementStory(makeFuture({ previous_percentage: null }))).toBeNull();
    expect(
      getMovementStory(makeFuture({ percentage: 20, previous_percentage: 20 })),
    ).toBeNull();
  });

  it("explains an increase with the real supporting evidence", () => {
    const story = getMovementStory(
      makeFuture({
        percentage: 30,
        previous_percentage: 18,
        supporting_observations: [
          { observationText: "Started an experiment before having a framework" },
          { observationText: "Changed plans when a more interesting option appeared" },
        ],
        supporting_situations: [
          { momentTitle: "Considering the Lisbon move" },
          { momentTitle: "Weekend hackathon decision" },
        ],
      }),
    )!;

    expect(story.direction).toBe("up");
    expect(story.headline).toBe("+12% since your last update");
    // The lead cites real situations, never a canned phrase.
    expect(story.lead).toContain("2 situations");
    expect(story.lead).toContain("Considering the Lisbon move");
    expect(story.evidence).toEqual([
      "Started an experiment before having a framework",
      "Changed plans when a more interesting option appeared",
    ]);
  });

  it("explains a decrease with the opposing evidence when recorded", () => {
    const story = getMovementStory(
      makeFuture({
        percentage: 12,
        previous_percentage: 20,
        opposing_observations: [
          { observationText: "Chose the familiar routine over a new opportunity" },
        ],
      }),
    )!;

    expect(story.direction).toBe("down");
    expect(story.headline).toBe("-8% since your last update");
    expect(story.evidence).toEqual([
      "Chose the familiar routine over a new opportunity",
    ]);
  });

  it("falls back to an honest direction-only line when a row carries no evidence", () => {
    const story = getMovementStory(
      makeFuture({ percentage: 12, previous_percentage: 20 }),
    )!;
    expect(story.evidence).toEqual([]);
    expect(story.lead).toContain("No new evidence reinforced this path");
  });
});

describe("getFadeStory", () => {
  const fadedFuture = makeFuture({
    status: "faded" as FutureSelf["status"],
    percentage: 0,
    previous_percentage: 18,
    updated_at: "2026-07-02T00:00:00Z",
  });

  const lifeEvents: FutureSelfEvent[] = [
    makeEvent({ id: "e1", event_type: "emerged", percentage_after: 12, created_at: "2026-05-01T00:00:00Z" }),
    makeEvent({ id: "e2", event_type: "grew", percentage_before: 12, percentage_after: 24, created_at: "2026-05-20T00:00:00Z" }),
    makeEvent({ id: "e3", event_type: "faded", percentage_before: 18, percentage_after: 0, created_at: "2026-07-02T00:00:00Z" }),
  ];

  it("reconstructs the strength trajectory from the event history", () => {
    const story = getFadeStory(fadedFuture, lifeEvents);
    expect(story.trajectory).toEqual(["12%", "24%", "18%", "faded"]);
    expect(story.lastStrength).toBe(18);
    expect(story.fadedOn).not.toBeNull();
  });

  it("tells the decline arc with real numbers, reflectively", () => {
    const story = getFadeStory(fadedFuture, lifeEvents);
    expect(story.why).toContain("reached 24%");
    expect(story.why).toContain("thinned to 18%");
  });

  it("uses opposing observations as the fade evidence when recorded", () => {
    const story = getFadeStory(
      { ...fadedFuture, opposing_observations: [{ observationText: "Repeated preference for familiar routines" }] },
      lifeEvents,
    );
    expect(story.evidenceLabel).toBe("What pushed against it");
    expect(story.evidence).toEqual(["Repeated preference for familiar routines"]);
  });

  it("falls back to the last supporting record when nothing opposed it", () => {
    const story = getFadeStory(
      { ...fadedFuture, supporting_situations: [{ momentTitle: "The startup weekend" }] },
      lifeEvents,
    );
    expect(story.evidenceLabel).toBe("Its last supporting evidence");
    expect(story.evidence).toEqual(["The startup weekend"]);
    expect(story.why).toContain("The startup weekend");
  });

  it("still tells a coherent story for a legacy row with no events", () => {
    const story = getFadeStory(fadedFuture, []);
    expect(story.trajectory).toEqual(["18%", "faded"]);
    expect(story.why).toContain("held 18%");
  });
});
