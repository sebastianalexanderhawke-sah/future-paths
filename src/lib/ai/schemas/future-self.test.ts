import { describe, expect, it } from "vitest";

import {
  futureSelfDraftSchema,
  futureSelfDiscoverOutputSchema,
  parseFutureSelfOutput,
} from "@/lib/ai/schemas/future-self";

const draftA = {
  name: "Steady Foundation Builder",
  summary: "Someone who keeps building steadily within familiar structures.",
  movement_direction: "positive" as const,
  evidence_strength: "Strong" as const,
  core_behaviors: [
    "Protects existing routines before considering new opportunities.",
    "Anchors decisions to confirmed realities.",
    "Moves slowly and deliberately when change is on the table.",
  ],
  behavioral_evidence: ["Turned down relocation offer to stay in current role."],
  growth_opportunities: [
    "Stability compounds over time.",
    "Existing relationships deepen.",
    "Day-to-day life stays predictable.",
  ],
  blind_spots: [
    "New opportunities outside the routine go unexplored.",
    "Growth slows without new challenge.",
    "The routine gets harder to leave the longer it continues.",
  ],
  likely_evolution:
    "Continues to favor consistency over novelty, with deep but narrow relationships.",
  themes: ["Stability"],
  why_emerging:
    "You turned down a relocation offer to stay in your current role. That keeps this steady, familiar path more likely.",
};

const draftB = {
  name: "Self-Reliant Architect",
  summary: "Someone who follows new opportunities even when it means starting over.",
  movement_direction: "unchanged" as const,
  evidence_strength: "Moderate" as const,
  core_behaviors: [
    "Makes major decisions without seeking external approval.",
    "Structures life to reduce dependency on any one place.",
    "Declines help that would come with conditions attached.",
  ],
  behavioral_evidence: [],
  growth_opportunities: [
    "New environments open new opportunities.",
    "Independence grows.",
    "Adaptability to change increases.",
  ],
  blind_spots: [
    "Existing relationships strain under distance.",
    "Temporary loneliness while rebuilding.",
    "Roots take longer to form in each new place.",
  ],
  likely_evolution:
    "Becomes someone who treats relocation as routine, trading depth of roots for breadth of experience.",
  themes: ["Independence", "Growth"],
  why_emerging: "",
};

describe("future self output", () => {
  it("allows empty discover results for reconciliation", () => {
    expect(parseFutureSelfOutput([])).toEqual([]);
    expect(futureSelfDiscoverOutputSchema.parse([])).toEqual([]);
  });

  it("still requires at least one draft when output is non-empty", () => {
    expect(() => parseFutureSelfOutput([{}])).toThrow();
  });

  it("accepts any combination of movement directions across drafts", () => {
    const parsed = parseFutureSelfOutput([draftA, draftB]);

    expect(parsed[0].movement_direction).toBe("positive");
    expect(parsed[1].movement_direction).toBe("unchanged");
  });

  it("rejects a movement_direction value outside the approved set", () => {
    expect(() =>
      parseFutureSelfOutput([{ ...draftA, movement_direction: "strongly_positive" }]),
    ).toThrow();
  });

  it("normalizes a common evidence_strength invention before schema validation", () => {
    const parsed = parseFutureSelfOutput([{ ...draftA, evidence_strength: "High" }]);

    expect(parsed[0].evidence_strength).toBe("Strong");
  });

  it("rejects an evidence_strength label the normalizer cannot map", () => {
    expect(() =>
      futureSelfDraftSchema.parse({ ...draftA, evidence_strength: "Unstoppable" }),
    ).toThrow();
  });

  it("allows an empty why_emerging when there is nothing to explain", () => {
    const parsed = parseFutureSelfOutput([draftB]);

    expect(parsed[0].why_emerging).toBe("");
  });

  it("rejects a why_emerging longer than the schema cap", () => {
    expect(() =>
      futureSelfDraftSchema.parse({ ...draftA, why_emerging: "a".repeat(401) }),
    ).toThrow();
  });
});
