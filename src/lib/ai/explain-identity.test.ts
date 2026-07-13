import { describe, expect, it } from "vitest";

import { needsExplanationRegeneration } from "@/lib/ai/explain-identity";

// A current-format (v8, Phase 4) narrative row: exactly three "What This
// Strengthens" bullets in growth_opportunities AND exactly three "Tradeoffs"
// bullets in blind_spots — the 3+3 shape is the sole format marker. Older
// shapes are derived from this by mutation: a one-element growth_opportunities
// or blind_spots is any v2–v7 row, an empty growth_opportunities is v2.
const CURRENT_ROW = {
  name: "The Quiet Authority",
  narrative_source: "ai",
  narrative_evidence_strength: "Emerging",
  likely_evolution:
    "You become the person people bring questions to before decisions get made.",
  growth_opportunities: [
    "Judgment other people learn to borrow.",
    "Comfort sitting with a problem until it opens.",
    "A track record of being right for boring reasons.",
  ],
  blind_spots: [
    "Speaking up early gets harder when being sure is the standard.",
    "People stop double-checking you, which raises the cost of a miss.",
    "Depth in one area crowds out breadth in the rest.",
  ],
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

  it("regenerates a v3–v7 narrative once — a single pull sentence in growth_opportunities is the pre-v8 shape", () => {
    const decision = needsExplanationRegeneration(
      {
        ...CURRENT_ROW,
        narrative_evidence_strength: "Strong",
        growth_opportunities: [
          "Order pulled from uncertainty long before anyone called it a career.",
        ],
        blind_spots: ["A single cost paragraph, the v2–v7 encoding."],
      },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("regenerates when only blind_spots predates v8 — both lists must carry exactly three bullets", () => {
    const decision = needsExplanationRegeneration(
      {
        ...CURRENT_ROW,
        narrative_evidence_strength: "Strong",
        blind_spots: ["A single cost paragraph, the v2–v7 encoding."],
      },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("regenerates a v2 narrative once — an empty growth_opportunities predates every current field", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong", growth_opportunities: [] },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("treats whitespace-only bullets as missing — three REAL strengthens bullets must exist", () => {
    const decision = needsExplanationRegeneration(
      {
        ...CURRENT_ROW,
        growth_opportunities: ["Real bullet.", "   ", "Another real bullet."],
      },
      "Emerging",
    );
    expect(decision).toEqual({ regenerate: true, reason: "format_upgrade" });
  });

  it("does not regenerate a current-format narrative — three strengthens bullets and three tradeoffs mark v8", () => {
    const decision = needsExplanationRegeneration(
      { ...CURRENT_ROW, narrative_evidence_strength: "Strong" },
      "Strong",
    );
    expect(decision).toEqual({ regenerate: false, reason: "stable" });
  });
});
