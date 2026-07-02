import { describe, expect, it } from "vitest";

import { needsExplanationRegeneration } from "@/lib/ai/explain-identity";

describe("needsExplanationRegeneration", () => {
  it("regenerates when an identity is recognized for the first time (no existing row)", () => {
    const decision = needsExplanationRegeneration(undefined);
    expect(decision).toEqual({ regenerate: true, reason: "new" });
  });

  it("does not regenerate when percentage moves within the same evidence_strength tier (22% -> 24%, both Emerging)", () => {
    const decision = needsExplanationRegeneration({ id: "fs-1" });
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("does not regenerate even when the evidence_strength tier crosses a boundary (24% Emerging -> 42% Moderate) — Phase 6C treats the narrative as a stable archetype, not per-situation output", () => {
    const decision = needsExplanationRegeneration({ id: "fs-1" });
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("does not regenerate when a faded identity reappears — reactivation is an ordinary situation, not a narrative-changing event", () => {
    const decision = needsExplanationRegeneration({ id: "fs-1" });
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("does not regenerate for a large percentage swing that stays within the Strong tier", () => {
    const decision = needsExplanationRegeneration({ id: "fs-1" });
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });
});
