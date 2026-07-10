import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import { getPromptDefinition } from "@/lib/ai/prompts/registry";
import { parseCurrentSelfFromBriefOutput } from "@/lib/ai/schemas/current-self";
import type { LedgerObservation } from "@/lib/behavior-ledger";
import {
  compareCurrentSelfDrafts,
  deriveThemesFromBrief,
  getCurrentSelfEngine,
  isCurrentSelfShadowCompareEnabled,
  stripRankedFutureAttribution,
} from "@/lib/current-self-brief";
import { buildIdentityBrief } from "@/lib/identity-brief";
import { generateMockCurrentSelfFromBrief } from "@/lib/mock-current-self-from-brief-generator";
import type { ThemeChange } from "@/types/database";
import { CHECK_IN_THEME_NAMES } from "@/types/enums";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NEWEST = "2026-01-01T00:00:00.000Z";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBeforeNewest(days: number): string {
  return new Date(Date.parse(NEWEST) - days * MS_PER_DAY).toISOString();
}

let nextId = 0;

function makeObs(overrides: Partial<LedgerObservation> = {}): LedgerObservation {
  nextId += 1;
  return {
    id: `obs-${String(nextId).padStart(4, "0")}`,
    observation: "Started a side project without being asked, then kept working on it weekly.",
    signals: ["starts_something_new"],
    momentId: "moment-1",
    sourceType: "situation_complete",
    extractedAt: NEWEST,
    ...overrides,
  };
}

/** An established persona: ~40 observations across 8 situations and 3 sources. */
function establishedPersonaObservations(): LedgerObservation[] {
  const signalRotation = [
    "chooses_solo_path",
    "starts_something_new",
    "takes_uncertain_risk",
    "journals_or_reflects",
    "asks_for_help",
    "maintains_commitment",
    "returns_after_setback",
    "creates_original_work",
  ] as const;
  const sourceRotation = ["situation_complete", "check_in", "reflection_answer"] as const;

  return Array.from({ length: 40 }, (_, i) =>
    makeObs({
      id: `persona-${String(i).padStart(3, "0")}`,
      signals: [signalRotation[i % signalRotation.length]],
      momentId: `m${i % 8}`,
      sourceType: sourceRotation[i % sourceRotation.length],
      extractedAt: daysBeforeNewest((40 - i) * 12),
    }),
  );
}

// ---------------------------------------------------------------------------
// Engine flag
// ---------------------------------------------------------------------------

describe("getCurrentSelfEngine", () => {
  const original = process.env.CURRENT_SELF_ENGINE;

  afterEach(() => {
    if (original === undefined) delete process.env.CURRENT_SELF_ENGINE;
    else process.env.CURRENT_SELF_ENGINE = original;
  });

  it("defaults to the brief engine", () => {
    delete process.env.CURRENT_SELF_ENGINE;
    expect(getCurrentSelfEngine()).toBe("brief");
  });

  it("reverts to legacy when configured", () => {
    process.env.CURRENT_SELF_ENGINE = "legacy";
    expect(getCurrentSelfEngine()).toBe("legacy");
  });

  it("throws on an unrecognized value instead of silently picking an engine", () => {
    process.env.CURRENT_SELF_ENGINE = "breif";
    expect(() => getCurrentSelfEngine()).toThrow(/Invalid CURRENT_SELF_ENGINE/);
  });
});

describe("isCurrentSelfShadowCompareEnabled", () => {
  const original = process.env.CURRENT_SELF_SHADOW_COMPARE;

  beforeEach(() => {
    delete process.env.CURRENT_SELF_SHADOW_COMPARE;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CURRENT_SELF_SHADOW_COMPARE;
    else process.env.CURRENT_SELF_SHADOW_COMPARE = original;
  });

  it("is off by default", () => {
    expect(isCurrentSelfShadowCompareEnabled()).toBe(false);
  });

  it("turns on with the flag outside production", () => {
    process.env.CURRENT_SELF_SHADOW_COMPARE = "true";
    expect(isCurrentSelfShadowCompareEnabled()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Theme derivation (gap G1)
// ---------------------------------------------------------------------------

describe("deriveThemesFromBrief", () => {
  it("is deterministic and independent of observation order", () => {
    const corpus = establishedPersonaObservations();
    const a = deriveThemesFromBrief(buildIdentityBrief(corpus));
    const b = deriveThemesFromBrief(buildIdentityBrief([...corpus].reverse()));

    expect(a).toEqual(b);
  });

  it("always returns 4–6 valid vocabulary themes", () => {
    const corpora = [
      [makeObs()],
      establishedPersonaObservations(),
      [makeObs({ signals: ["avoids_conflict"] })],
    ];

    for (const corpus of corpora) {
      const themes = deriveThemesFromBrief(buildIdentityBrief(corpus));
      expect(themes.length).toBeGreaterThanOrEqual(4);
      expect(themes.length).toBeLessThanOrEqual(6);
      for (const theme of themes) {
        expect(CHECK_IN_THEME_NAMES).toContain(theme);
      }
      expect(new Set(themes).size).toBe(themes.length);
    }
  });

  it("maps evidence to its natural themes", () => {
    const corpus = [
      makeObs({ signals: ["creates_original_work"], momentId: "m1" }),
      makeObs({ signals: ["creates_original_work"], momentId: "m2" }),
      makeObs({ signals: ["returns_after_setback"], momentId: "m3" }),
      makeObs({ signals: ["chooses_solo_path"], momentId: "m4" }),
    ];

    const themes = deriveThemesFromBrief(buildIdentityBrief(corpus));
    expect(themes).toContain("Creativity");
    expect(themes).toContain("Resilience");
    expect(themes).toContain("Independence");
  });

  it("never surfaces Courage from conflict-avoidant or risk-declining evidence", () => {
    const corpus = [
      makeObs({ signals: ["avoids_conflict"], momentId: "m1" }),
      makeObs({ signals: ["declines_risky_opportunity"], momentId: "m2" }),
      makeObs({ signals: ["avoids_conflict"], momentId: "m3" }),
    ];

    // These signals carry negative Risk/Conflict Tolerance weights — their
    // themes come from overrides (Stability), never the dimension map.
    const brief = buildIdentityBrief(corpus);
    const evidenced = deriveThemesFromBrief(brief).slice(0, brief.topSignals.length + 1);
    expect(evidenced[0]).toBe("Stability");
  });

  it("pads sparse ledgers to the 4-theme minimum deterministically", () => {
    const themes = deriveThemesFromBrief(buildIdentityBrief([makeObs()]));
    expect(themes).toHaveLength(4);
    expect(themes[0]).toBe("Growth"); // starts_something_new → Initiative → Growth
  });
});

// ---------------------------------------------------------------------------
// Mock generator
// ---------------------------------------------------------------------------

describe("generateMockCurrentSelfFromBrief", () => {
  it("returns null for an empty brief (mirrors the nullable contract)", () => {
    expect(generateMockCurrentSelfFromBrief(buildIdentityBrief([]))).toBeNull();
  });

  it("produces schema-valid drafts from sparse and established briefs alike", () => {
    const corpora = [[makeObs()], establishedPersonaObservations()];

    for (const corpus of corpora) {
      const draft = generateMockCurrentSelfFromBrief(buildIdentityBrief(corpus));
      expect(draft).not.toBeNull();
      // Throws if the draft violates the output contract.
      const parsed = parseCurrentSelfFromBriefOutput(draft);
      expect(parsed?.values).toHaveLength(3);
    }
  });

  it("is deterministic", () => {
    const corpus = establishedPersonaObservations();
    expect(generateMockCurrentSelfFromBrief(buildIdentityBrief(corpus))).toEqual(
      generateMockCurrentSelfFromBrief(buildIdentityBrief(corpus)),
    );
  });
});

// ---------------------------------------------------------------------------
// Shadow comparator
// ---------------------------------------------------------------------------

describe("compareCurrentSelfDrafts", () => {
  it("surfaces the structural differences between two drafts", () => {
    const brief = buildIdentityBrief(establishedPersonaObservations());
    const draft = generateMockCurrentSelfFromBrief(brief)!;
    const themes = deriveThemesFromBrief(brief);

    const legacy = {
      ...draft,
      title: "A different title",
      values: ["Freedom\nEvidence.", "Growth\nEvidence.", "Meaning\nEvidence."],
      core_tradeoff: null,
      themes: ["Growth", "Courage", "Curiosity", "Stability"] as typeof themes,
    };

    const comparison = compareCurrentSelfDrafts(legacy, draft, themes);

    expect(comparison.title).toEqual({ legacy: "A different title", brief: draft.title });
    expect(comparison.valueNames.legacy).toEqual(["Freedom", "Growth", "Meaning"]);
    expect(comparison.coreTradeoffPresent.legacy).toBe(false);
    expect(comparison.themes.brief).toEqual(themes);
  });
});

// ---------------------------------------------------------------------------
// Prompt size reduction (success criterion)
// ---------------------------------------------------------------------------

/** A representative legacy context for an active account — the shape
 *  loadCurrentSelfContext produces at its SQL caps. */
function legacyPersonaBundle(): IdentityContextBundle {
  const themeChanges: ThemeChange[] = [
    { theme: "Growth", direction: "strengthened" },
    { theme: "Independence", direction: "emerging" },
  ];

  return {
    userId: "user-1",
    profile: "current_self",
    counts: { moments: 14, checkIns: 22 },
    futureSelves: Array.from({ length: 5 }, (_, i) => ({
      name: `The Builder Variant ${i}`,
      summary:
        "A version of you that keeps choosing to build things on your own terms, trading certainty for ownership across most of the recorded decisions this year.",
      percentage: 60 - i * 7,
      evidence_strength: "Moderate",
      themes: ["Growth", "Independence"],
    })) as IdentityContextBundle["futureSelves"],
    pathThemes: Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? "Growth" : "Independence",
    ) as IdentityContextBundle["pathThemes"],
    checkIns: Array.from({ length: 10 }, (_, i) => ({
      theme_changes: themeChanges,
      identity_impact: `I realized I keep choosing the harder option when it means keeping control of the outcome, even when a safer version was on the table (check-in ${i}).`,
    })),
    identityUpdates: Array.from({ length: 5 }, (_, i) => ({
      title: `A shift toward self-direction ${i}`,
      summary:
        "You may be becoming someone who trusts their own read of a situation before external validation arrives.",
      themes: ["Independence"] as IdentityContextBundle["pathThemes"],
    })) as IdentityContextBundle["identityUpdates"],
    recentMoments: Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      title: `Deciding whether to take the contract role ${i}`,
      description:
        "An offer came in that pays better but locks the next year. Taking it means pausing the studio work that has been going well lately; declining means another six months of uncertainty.",
      status: "active",
      created_at: daysBeforeNewest(i * 20),
    })) as IdentityContextBundle["recentMoments"],
    currentSelfChosenPaths: Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      moment_id: `m${i}`,
      description:
        "Decline the offer and keep building the studio, taking on two smaller clients to cover the gap while the main project matures.",
      themes: ["Independence", "Growth"] as IdentityContextBundle["pathThemes"],
      future_shift: "You may become more comfortable betting on your own work.",
    })) as IdentityContextBundle["currentSelfChosenPaths"],
    currentSelfCheckIns: Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      moment_id: `m${i}`,
      theme_changes: themeChanges,
      identity_impact:
        "I noticed I defended the decision to myself less this time — it already felt like mine.",
      reflection_question: "What did keeping control cost you this month?",
      reflection_answer:
        "Mostly rest, honestly. But the work feels like it belongs to me in a way the salaried version never did, and I keep choosing that.",
      created_at: daysBeforeNewest(i * 15),
    })) as IdentityContextBundle["currentSelfCheckIns"],
  };
}

describe("prompt size reduction", () => {
  const legacyDefinition = getPromptDefinition("current_self.generate");
  const briefDefinition = getPromptDefinition("current_self.generate_from_brief");

  it("shrinks the system prompt to well under the legacy size", () => {
    const legacy = legacyDefinition.buildSystemPrompt().length;
    const brief = briefDefinition.buildSystemPrompt().length;

    expect(brief).toBeLessThan(legacy * 0.6);
  });

  it("shrinks the total prompt for a representative established persona", () => {
    const legacyBundle = legacyPersonaBundle();
    // Mirror production: Current Self's context always goes through its
    // view, which hides the v4.3 attribution payload.
    const briefBundle: IdentityContextBundle = {
      userId: "user-1",
      profile: "current_self_brief",
      identityBrief: stripRankedFutureAttribution(
        buildIdentityBrief(establishedPersonaObservations()),
      ),
    };

    const legacyTotal =
      legacyDefinition.buildSystemPrompt().length +
      legacyDefinition.buildUserPrompt(legacyBundle).length;
    const briefTotal =
      briefDefinition.buildSystemPrompt().length +
      briefDefinition.buildUserPrompt(briefBundle).length;

    expect(briefTotal).toBeLessThan(legacyTotal * 0.8);
  });

  it("passes no raw situations, reflections, or check-ins into the brief prompt", () => {
    const briefBundle: IdentityContextBundle = {
      userId: "user-1",
      profile: "current_self_brief",
      identityBrief: stripRankedFutureAttribution(
        buildIdentityBrief(establishedPersonaObservations()),
      ),
    };

    const userPrompt = briefDefinition.buildUserPrompt(briefBundle);

    // The serialized context must contain exactly the brief — none of the
    // legacy context keys that carry raw life data.
    for (const forbiddenKey of [
      "recentMoments",
      "currentSelfCheckIns",
      "currentSelfChosenPaths",
      "reflectionQA",
      "identityUpdates",
      "futureSelves",
      "pathThemes",
    ]) {
      expect(userPrompt).not.toContain(`"${forbiddenKey}"`);
    }
    expect(userPrompt).toContain('"identityBrief"');

    // v4.3: the per-identity attribution payload exists for Future Selves,
    // not the portrait — Current Self's view must hide it entirely.
    for (const attributionKey of [
      "supportingDimensions",
      "opposingDimensions",
      "supportingEvidence",
      "opposingEvidence",
      "supportingSituationCount",
      "supportingObservationCount",
    ]) {
      expect(userPrompt).not.toContain(`"${attributionKey}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// Current Self's view of rankedFutures (v4.3)
// ---------------------------------------------------------------------------

describe("stripRankedFutureAttribution", () => {
  it("keeps exactly the pre-v4.3 ranking fields, in place", () => {
    const brief = buildIdentityBrief(establishedPersonaObservations());
    const stripped = stripRankedFutureAttribution(brief);

    expect(stripped.rankedFutures.length).toBe(brief.rankedFutures.length);
    for (const [index, future] of stripped.rankedFutures.entries()) {
      expect(Object.keys(future).sort()).toEqual([
        "canonicalName",
        "confidence",
        "evidenceStrength",
        "identityId",
        "likelihood",
        "matchedDimensions",
        "score",
      ]);
      expect(future.likelihood).toBe(brief.rankedFutures[index].likelihood);
    }
  });

  it("leaves every other brief section untouched", () => {
    const brief = buildIdentityBrief(establishedPersonaObservations());
    const stripped = stripRankedFutureAttribution(brief);

    expect(stripped.topSignals).toEqual(brief.topSignals);
    expect(stripped.signalRelations).toEqual(brief.signalRelations);
    expect(stripped.stability).toEqual(brief.stability);
    expect(stripped.recentChanges).toEqual(brief.recentChanges);
    expect(stripped.summary).toEqual(brief.summary);
    expect(stripped.behaviorEngineVersion).toBe(brief.behaviorEngineVersion);
    expect(stripped.generatedAt).toBe(brief.generatedAt);
  });
});
