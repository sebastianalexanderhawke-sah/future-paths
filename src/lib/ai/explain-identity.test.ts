import { describe, expect, it } from "vitest";

import { needsExplanationRegeneration } from "@/lib/ai/explain-identity";

// A current-format (v3) narrative row: newline-separated closing question in
// likely_evolution AND the "What keeps pulling you here" line in
// growth_opportunities. Older shapes are derived from this by omission.
const V3_ROW = {
  narrative_source: "ai",
  narrative_evidence_strength: "Emerging",
  likely_evolution: "Becomes someone defined by steady output.\nWould you keep choosing it?",
  growth_opportunities: ["Order pulled from uncertainty long before anyone called it a career."],
};

describe("needsExplanationRegeneration", () => {
  it("regenerates when an identity is recognized for the first time (no existing row)", () => {
    const decision = needsExplanationRegeneration(undefined, "Emerging");
    expect(decision).toEqual({ regenerate: true, reason: "new" });
  });

  it("does not regenerate when percentage moves within the same evidence tier the narrative was written at", () => {
    const decision = needsExplanationRegeneration({ ...V3_ROW }, "Emerging");
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates when the stored narrative is a fallback — a transient AI failure must never become the permanent narrative", () => {
    const decision = needsExplanationRegeneration(
      { ...V3_ROW, narrative_source: "fallback" },
      "Emerging",
    );
    expect(decision).toEqual({ regenerate: true, reason: "fallback_repair" });
  });

  it("regenerates when the evidence tier has increased since the narrative was written (Emerging → Moderate)", () => {
    const decision = needsExplanationRegeneration({ ...V3_ROW }, "Moderate");
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("regenerates when the tier jumps two levels (Emerging → Strong)", () => {
    const decision = needsExplanationRegeneration({ ...V3_ROW }, "Strong");
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("does not regenerate when the tier has DECREASED — decay-driven oscillation around a boundary must not cause churn", () => {
    const decision = needsExplanationRegeneration(
      { ...V3_ROW, narrative_evidence_strength: "Strong" },
      "Moderate",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("does not regenerate a stable AI narrative at the same tier even after a large percentage swing", () => {
    const decision = needsExplanationRegeneration(
      { ...V3_ROW, narrative_evidence_strength: "Strong" },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("treats a row without a recorded written-at tier (pre-provenance legacy) as stable rather than churning", () => {
    const decision = needsExplanationRegeneration(
      { ...V3_ROW, narrative_evidence_strength: null },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates a pre-v2 narrative once — a stored likely_evolution without the newline-separated reflective question is the old format", () => {
    const decision = needsExplanationRegeneration(
      {
        ...V3_ROW,
        narrative_evidence_strength: "Strong",
        likely_evolution: "Becomes someone defined by steady output.",
      },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("regenerates a v2 narrative once — newline format but no 'What keeps pulling you here' line means it predates v3", () => {
    const decision = needsExplanationRegeneration(
      { ...V3_ROW, narrative_evidence_strength: "Strong", growth_opportunities: [] },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("treats whitespace-only growth_opportunities as missing — the pull line must actually exist", () => {
    const decision = needsExplanationRegeneration(
      { ...V3_ROW, growth_opportunities: ["   "] },
      "Emerging",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("does not regenerate a v3 narrative — pull line present and question newline present mark the current format", () => {
    const decision = needsExplanationRegeneration(
      { ...V3_ROW, narrative_evidence_strength: "Strong" },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });
});
