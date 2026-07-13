import type { FutureSelf } from "@/types/database";

/**
 * Illustrative Future Selves for the onboarding preview — step 6 renders the
 * canonical BranchMap over these so a first-time user sees what the map
 * BECOMES, in the exact visual language the real one will use.
 *
 * Purely fictional by design: these rows are never persisted, never derived
 * from the user's first situation, and never mix with real data — the panel
 * says so out loud. Percentages are chosen to show the full grammar of the
 * stage (a leading future, a close rival, quieter possibilities).
 */
function illustrativeFutureSelf(
  overrides: Pick<FutureSelf, "id" | "name" | "summary" | "percentage" | "themes">,
): FutureSelf {
  return {
    user_id: "onboarding-preview",
    previous_percentage: null,
    evidence_strength: "Emerging",
    core_behaviors: [],
    behavioral_evidence: [],
    growth_opportunities: [],
    blind_spots: [],
    likely_evolution: "",
    why_emerging: "",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    identity_id: null,
    confidence: null,
    dimension_breakdown: null,
    supporting_observations: null,
    supporting_situations: null,
    opposing_observations: null,
    narrative_source: "fallback",
    narrative_evidence_strength: null,
    ...overrides,
  };
}

export const ILLUSTRATIVE_FUTURE_SELVES: FutureSelf[] = [
  illustrativeFutureSelf({
    id: "preview-builder",
    name: "Independent Builder",
    summary: "Keeps choosing to make things rather than wait for permission.",
    percentage: 58,
    themes: ["Independence", "Creativity"],
  }),
  illustrativeFutureSelf({
    id: "preview-anchor",
    name: "Reliable Anchor",
    summary: "Shows up for the same people, again and again.",
    percentage: 41,
    themes: ["Stability", "Belonging"],
  }),
  illustrativeFutureSelf({
    id: "preview-explorer",
    name: "Curious Explorer",
    summary: "Trades comfort for the next unfamiliar room.",
    percentage: 24,
    themes: ["Curiosity", "Courage"],
  }),
  illustrativeFutureSelf({
    id: "preview-mentor",
    name: "Thoughtful Mentor",
    summary: "Ends up being the person others think out loud with.",
    percentage: 13,
    themes: ["Connection", "Leadership"],
  }),
];
