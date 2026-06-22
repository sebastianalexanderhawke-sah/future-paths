import { describe, expect, it } from "vitest";

import {
  futureSelfDraftSchema,
  futureSelfDiscoverOutputSchema,
  parseFutureSelfOutput,
} from "@/lib/ai/schemas/future-self";

const draftA = {
  name: "Stays close to current work and routines",
  summary: "Someone who keeps building steadily within familiar structures.",
  movement_direction: "positive" as const,
  evidence_strength: "Strong" as const,
  benefits: [
    "Stability compounds over time.",
    "Existing relationships deepen.",
    "Day-to-day life stays predictable.",
  ],
  consequences: [
    "New opportunities outside the routine go unexplored.",
    "Growth slows without new challenge.",
    "The routine gets harder to leave the longer it continues.",
  ],
  prediction: "Continues to favor consistency over novelty, with deep but narrow relationships.",
  themes: ["Stability"],
  why_changed: "You turned down a relocation offer to stay in your current role. That keeps this steady, familiar path more likely.",
};

const draftB = {
  name: "Relocates and rebuilds a social circle elsewhere",
  summary: "Someone who follows new opportunities even when it means starting over.",
  movement_direction: "unchanged" as const,
  evidence_strength: "Moderate" as const,
  benefits: [
    "New environments open new opportunities.",
    "Independence grows.",
    "Adaptability to change increases.",
  ],
  consequences: [
    "Existing relationships strain under distance.",
    "Temporary loneliness while rebuilding.",
    "Roots take longer to form in each new place.",
  ],
  prediction: "Becomes someone who treats relocation as routine, trading depth of roots for breadth of experience.",
  themes: ["Independence", "Growth"],
  why_changed: "",
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

  it("allows an empty why_changed when there is nothing to explain", () => {
    const parsed = parseFutureSelfOutput([draftB]);

    expect(parsed[0].why_changed).toBe("");
  });

  it("rejects a why_changed longer than the schema cap", () => {
    expect(() =>
      futureSelfDraftSchema.parse({ ...draftA, why_changed: "a".repeat(401) }),
    ).toThrow();
  });
});
