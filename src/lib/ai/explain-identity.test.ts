import { describe, expect, it } from "vitest";

import { needsExplanationRegeneration } from "@/lib/ai/explain-identity";

describe("needsExplanationRegeneration", () => {
  it("regenerates when an identity is recognized for the first time (no existing row)", () => {
    const decision = needsExplanationRegeneration(undefined, "Emerging");
    expect(decision).toEqual({ regenerate: true, reason: "new" });
  });

  it("does not regenerate when percentage moves within the same evidence tier the narrative was written at", () => {
    const decision = needsExplanationRegeneration(
      { narrative_source: "ai", narrative_evidence_strength: "Emerging" },
      "Emerging",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates when the stored narrative is a fallback — a transient AI failure must never become the permanent narrative", () => {
    const decision = needsExplanationRegeneration(
      { narrative_source: "fallback", narrative_evidence_strength: "Emerging" },
      "Emerging",
    );
    expect(decision).toEqual({ regenerate: true, reason: "fallback_repair" });
  });

  it("regenerates when the evidence tier has increased since the narrative was written (Emerging → Moderate)", () => {
    const decision = needsExplanationRegeneration(
      { narrative_source: "ai", narrative_evidence_strength: "Emerging" },
      "Moderate",
    );
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("regenerates when the tier jumps two levels (Emerging → Strong)", () => {
    const decision = needsExplanationRegeneration(
      { narrative_source: "ai", narrative_evidence_strength: "Emerging" },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("does not regenerate when the tier has DECREASED — decay-driven oscillation around a boundary must not cause churn", () => {
    const decision = needsExplanationRegeneration(
      { narrative_source: "ai", narrative_evidence_strength: "Strong" },
      "Moderate",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("does not regenerate a stable AI narrative at the same tier even after a large percentage swing", () => {
    const decision = needsExplanationRegeneration(
      { narrative_source: "ai", narrative_evidence_strength: "Strong" },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("treats a row without a recorded written-at tier (pre-provenance legacy) as stable rather than churning", () => {
    const decision = needsExplanationRegeneration(
      { narrative_source: "ai", narrative_evidence_strength: null },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates a pre-v2 narrative once — a stored likely_evolution without the newline-separated reflective question is the old format", () => {
    const decision = needsExplanationRegeneration(
      {
        narrative_source: "ai",
        narrative_evidence_strength: "Strong",
        likely_evolution: "Becomes someone defined by steady output.",
      },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("does not regenerate a v2 narrative — the closing question's newline marks the current format", () => {
    const decision = needsExplanationRegeneration(
      {
        narrative_source: "ai",
        narrative_evidence_strength: "Strong",
        likely_evolution:
          "Becomes someone defined by steady output.\nWould you keep choosing it?",
      },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });
});
