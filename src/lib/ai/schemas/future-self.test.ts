import { describe, expect, it } from "vitest";

import {
  futureSelfDraftSchema,
  futureSelfDiscoverOutputSchema,
  parseFutureSelfOutput,
} from "@/lib/ai/schemas/future-self";

const draftA = {
  name: "Stays close to current work and routines",
  summary: "Someone who keeps building steadily within familiar structures.",
  percentage: 60,
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
};

const draftB = {
  name: "Relocates and rebuilds a social circle elsewhere",
  summary: "Someone who follows new opportunities even when it means starting over.",
  percentage: 40,
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
};

describe("future self output", () => {
  it("allows empty discover results for reconciliation", () => {
    expect(parseFutureSelfOutput([])).toEqual([]);
    expect(futureSelfDiscoverOutputSchema.parse([])).toEqual([]);
  });

  it("still requires at least one draft when output is non-empty", () => {
    expect(() => parseFutureSelfOutput([{}])).toThrow();
  });

  it("accepts drafts whose percentages sum to 100", () => {
    const parsed = parseFutureSelfOutput([draftA, draftB]);

    expect(parsed[0].percentage + parsed[1].percentage).toBe(100);
  });

  it("rejects drafts whose percentages do not sum to 100", () => {
    expect(() =>
      parseFutureSelfOutput([
        { ...draftA, percentage: 70 },
        { ...draftB, percentage: 50 },
      ]),
    ).toThrow();
  });

  it("normalizes a common evidence_strength invention before schema validation", () => {
    const parsed = parseFutureSelfOutput([{ ...draftA, percentage: 100, evidence_strength: "High" }]);

    expect(parsed[0].evidence_strength).toBe("Strong");
  });

  it("rejects an evidence_strength label the normalizer cannot map", () => {
    expect(() =>
      futureSelfDraftSchema.parse({ ...draftA, percentage: 100, evidence_strength: "Unstoppable" }),
    ).toThrow();
  });
});
