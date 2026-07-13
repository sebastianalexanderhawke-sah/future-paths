import { describe, expect, it } from "vitest";

import { needsExplanationRegeneration } from "@/lib/ai/explain-identity";

// A current (Phase 6) row: the card copy is permanent library editorial, so
// the only per-row AI state is the personalized summary sentence, the
// evidence bullets, and their provenance. A row is "personalized" when its
// summary differs from the library short_description.
const SHORT_DESCRIPTION =
  "Someone whose independence keeps turning into things that exist.";
const CANONICAL_NAME = "Independent Builder";

const CURRENT_ROW = {
  name: CANONICAL_NAME,
  summary: "You keep taking on the projects nobody assigned you.",
  narrative_source: "ai",
  narrative_evidence_strength: "Emerging",
};

describe("needsExplanationRegeneration", () => {
  it("regenerates when an identity is recognized for the first time (no existing row)", () => {
    const decision = needsExplanationRegeneration(undefined, "Emerging");
    expect(decision).toEqual({ regenerate: true, reason: "new" });
  });

  it("does not regenerate when percentage moves within the same evidence tier the personalization was written at", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW },
      "Emerging",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates when the stored personalization is a fallback — a transient AI failure must never become permanent", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_source: "fallback" },
      "Emerging",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: true, reason: "fallback_repair" });
  });

  it("regenerates once when the row still carries a pre-rename name — a library rename is a personalization epoch", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, name: "The Self-Reliant Builder" },
      "Emerging",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: true, reason: "identity_renamed" });
  });

  it("skips the rename check when the row has no stored name — never churns on incomplete rows", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, name: null },
      "Emerging",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("regenerates once when the summary still holds the library description — the not-yet-personalized state", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, summary: SHORT_DESCRIPTION },
      "Emerging",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: true, reason: "personalization_missing" });
  });

  it("regenerates when the row has no summary at all", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, summary: null },
      "Emerging",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: true, reason: "personalization_missing" });
  });

  it("repairs a fallback before checking personalization — a fallback row rewrites everything AI-owned at once", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, summary: SHORT_DESCRIPTION, narrative_source: "fallback" },
      "Emerging",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: true, reason: "fallback_repair" });
  });

  it("regenerates when the evidence tier has increased since the personalization was written (Emerging → Moderate)", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW },
      "Moderate",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("regenerates when the tier jumps two levels (Emerging → Strong)", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW },
      "Strong",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: true, reason: "evidence_tier_increased" });
  });

  it("does not regenerate when the tier has DECREASED — decay-driven oscillation around a boundary must not cause churn", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong" },
      "Moderate",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("does not regenerate a stable personalization at the same tier even after a large percentage swing", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong" },
      "Strong",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });

  it("treats a row without a recorded written-at tier (pre-provenance legacy) as stable rather than churning", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: null },
      "Strong",
      CANONICAL_NAME,
      SHORT_DESCRIPTION,
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });
});
