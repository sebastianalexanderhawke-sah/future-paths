import { describe, expect, it } from "vitest";

import { needsExplanationRegeneration } from "@/lib/ai/explain-identity";

// A current-format (v6) narrative row: newline-separated closing recognition
// moment (never a question) in likely_evolution AND the "What keeps pulling
// you here" line in growth_opportunities. Older shapes are derived from this
// by mutation: no newline = pre-v2, "?"-terminated last line = v2–v5, empty
// growth_opportunities = v2.
const CURRENT_ROW = {
  name: "The Quiet Authority",
  narrative_source: "ai",
  narrative_evidence_strength: "Emerging",
  likely_evolution:
    "Becomes someone defined by steady output.\nOne day the hardest question in the room is walking toward you.",
  growth_opportunities: ["Order pulled from uncertainty long before anyone called it a career."],
};

const CANONICAL_NAME = "The Quiet Authority";

describe("needsExplanationRegeneration", () => {
  it("regenerates when an identity is recognized for the first time (no existing row)", () => {
    const decision = needsExplanationRegeneration(undefined, "Emerging");
    expect(decision).toEqual({ regenerate: true, reason: "new" });
  });

  it("does not regenerate when percentage moves within the same evidence tier the narrative was written at", () => {
    const decision = needsExplanationRegeneration({ ...CURRENT_ROW }, "Emerging");
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates when the stored narrative is a fallback — a transient AI failure must never become the permanent narrative", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_source: "fallback" },
      "Emerging",
    );
    expect(decision).toEqual({ regenerate: true, reason: "fallback_repair" });
  });

  it("regenerates once when the row still carries a pre-rename name — a library rename is always part of a writing upgrade", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, name: "The Scholar" },
      "Emerging",
      CANONICAL_NAME,
    );
    expect(decision).toEqual({ regenerate: true, reason: "identity_renamed" });
  });

  it("does not regenerate when the stored name matches the current canonical name", () => {
    const decision = needsExplanationRegeneration({ ...CURRENT_ROW }, "Emerging", CANONICAL_NAME);
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("skips the rename check when the row has no stored name — never churns on incomplete rows", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, name: null },
      "Emerging",
      CANONICAL_NAME,
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates when the evidence tier has increased since the narrative was written (Emerging → Moderate)", () => {
    const decision = needsExplanationRegeneration({ ...CURRENT_ROW }, "Moderate");
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("regenerates when the tier jumps two levels (Emerging → Strong)", () => {
    const decision = needsExplanationRegeneration({ ...CURRENT_ROW }, "Strong");
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("does not regenerate when the tier has DECREASED — decay-driven oscillation around a boundary must not cause churn", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong" },
      "Moderate",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("does not regenerate a stable AI narrative at the same tier even after a large percentage swing", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong" },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("treats a row without a recorded written-at tier (pre-provenance legacy) as stable rather than churning", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: null },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates a pre-v2 narrative once — a stored likely_evolution without the newline-separated reflective question is the old format", () => {
    const decision = needsExplanationRegeneration(
      {
        ...CURRENT_ROW,
        narrative_evidence_strength: "Strong",
        likely_evolution: "Becomes someone defined by steady output.",
      },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("regenerates a v2–v5 narrative once — a final line ending in '?' is the retired reflective-question format", () => {
    const decision = needsExplanationRegeneration(
      {
        ...CURRENT_ROW,
        narrative_evidence_strength: "Strong",
        likely_evolution: "Becomes someone defined by steady output.\nWould you keep choosing it?",
      },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("regenerates a v2 narrative once — newline format but no 'What keeps pulling you here' line means it predates v3", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong", growth_opportunities: [] },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("treats whitespace-only growth_opportunities as missing — the pull line must actually exist", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, growth_opportunities: ["   "] },
      "Emerging",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("does not regenerate a v3 narrative — pull line present and question newline present mark the current format", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong" },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });
});
