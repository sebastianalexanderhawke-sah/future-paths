import { describe, expect, it } from "vitest";

import { CONTEXT_LIMITS } from "@/lib/ai/context/limits";
import { enforceContextLimits } from "@/lib/ai/context/truncate";
import { APPROVED_THEME_NAMES } from "@/lib/ai/prompts/shared/theme-instructions";
import { APPROVED_IDENTITY_UPDATE_TYPES } from "@/lib/ai/prompts/shared/identity-update-instructions";
import {
  FINAL_AI_MIGRATION_PROMPT_ID,
  PROMPT_MIGRATION_ORDER,
  getFinalMigrationPromptId,
  getPromptDefinition,
  isRegisteredPromptId,
  listPromptDefinitions,
} from "@/lib/ai/prompts/registry";

describe("prompt registry", () => {
  it("registers every migration-order prompt id with buildable prompts", () => {
    expect(PROMPT_MIGRATION_ORDER.length).toBeGreaterThan(0);

    for (const promptId of PROMPT_MIGRATION_ORDER) {
      const definition = getPromptDefinition(promptId);

      expect(definition.promptId).toBe(promptId);
      // Versions advance independently per prompt; the contract is that each
      // definition carries a numeric version string for audit records.
      expect(definition.promptVersion).toMatch(/^\d+$/);
      expect(definition.buildSystemPrompt().length).toBeGreaterThan(50);

      // The user prompt must embed the serialized context bundle.
      const userPrompt = definition.buildUserPrompt({
        userId: "user-1",
        profile: promptId,
      });
      expect(userPrompt).toContain("Context JSON");
      expect(userPrompt).toContain("user-1");
    }
  });

  it("lists prompts in migration order", () => {
    const definitions = listPromptDefinitions();

    expect(definitions.map((entry) => entry.promptId)).toEqual([
      ...PROMPT_MIGRATION_ORDER,
    ]);
  });

  it("keeps timeline as the final AI migration", () => {
    expect(getFinalMigrationPromptId()).toBe("timeline.generate");
    expect(FINAL_AI_MIGRATION_PROMPT_ID).toBe("timeline.generate");
    expect(PROMPT_MIGRATION_ORDER.at(-1)).toBe("timeline.generate");
  });

  it("validates registered prompt ids", () => {
    expect(isRegisteredPromptId("crossroad.generate")).toBe(true);
    expect(isRegisteredPromptId("unknown.prompt")).toBe(false);
  });

  it("requires crossroad.generate to enumerate approved themes", () => {
    const definition = getPromptDefinition("crossroad.generate");
    const systemPrompt = definition.buildSystemPrompt();
    const userPrompt = definition.buildUserPrompt({
      userId: "user-1",
      profile: "crossroad",
    });

    for (const theme of APPROVED_THEME_NAMES) {
      expect(systemPrompt).toContain(theme);
      expect(userPrompt).toContain(theme);
    }

    expect(systemPrompt).toContain("Never invent themes");
    expect(userPrompt).toContain("Never invent theme labels");
    // Crossroads Phase A: a path is a meaningfully different life one year
    // out — at least five of them, never implementation variants.
    expect(systemPrompt).toContain("fundamentally different directions");
    expect(systemPrompt).toContain("Implementations change the first step.");
    expect(systemPrompt).toContain("challenges_assumption");
    expect(userPrompt).toContain("paths (5–6 items)");
    expect(userPrompt).toContain("If both paths succeed");
    // Phase B: distinct core tensions per path, and the path/forecast
    // boundary — the path is the commitment, the forecast is the year after.
    expect(systemPrompt).toContain("core tension");
    expect(systemPrompt).toContain("What direction do I choose?");
    expect(systemPrompt).toContain("inner landscape");
    expect(systemPrompt).toContain("What happens?");
  });

  it("requires future_self.discover to return movement_direction instead of a percentage", () => {
    const definition = getPromptDefinition("future_self.discover");
    const systemPrompt = definition.buildSystemPrompt();
    const userPrompt = definition.buildUserPrompt({
      userId: "user-1",
      profile: "future_self",
    });

    // The prompt must teach exactly the vocabulary the output parser enforces.
    expect(systemPrompt).toContain("movement_direction");
    expect(userPrompt).toContain("positive, negative, unchanged");
    expect(systemPrompt).toContain("Emerging, Moderate, Strong");

    // And the parser holds the model to it: a movement_direction draft parses…
    const validDraft = {
      name: "Self-Reliant Builder",
      summary: "You keep choosing to build things on your own terms.",
      movement_direction: "positive",
      evidence_strength: "Emerging",
      core_behaviors: [
        "Ships side projects on a regular schedule",
        "Applies for roles above current experience level",
        "Asks for feedback directly instead of waiting",
      ],
      behavioral_evidence: ["Chose the Dallas role", "Launched the MVP"],
      growth_opportunities: [
        "Larger projects become realistic",
        "A reputation for finishing forms",
        "New collaborators seek you out",
      ],
      blind_spots: [
        "Undervalues rest between pushes",
        "Misses help others would offer",
        "Avoids delegating early",
      ],
      likely_evolution:
        "You become someone who treats building as the default response to uncertainty.",
      themes: ["Growth"],
      why_emerging: "You shipped the project you had postponed for months.",
    };

    const parsed = definition.parseOutput([validDraft]) as Array<
      Record<string, unknown>
    >;
    expect(parsed[0]?.movement_direction).toBe("positive");
    expect(parsed[0]).not.toHaveProperty("percentage");

    // …while the old percentage-only contract is rejected.
    const { movement_direction: _dropped, ...withoutDirection } = validDraft;
    expect(() =>
      definition.parseOutput([{ ...withoutDirection, percentage: 62 }]),
    ).toThrow();
  });

  it("requires future_self.discover to preserve identity across generations", () => {
    const definition = getPromptDefinition("future_self.discover");
    const systemPrompt = definition.buildSystemPrompt();

    expect(systemPrompt).toContain("Continuity:");
    expect(systemPrompt).toContain("reuse its exact name");
  });

  it("requires forecast.generate to produce 6-8 risk/opportunity cards", () => {
    const definition = getPromptDefinition("forecast.generate");
    const systemPrompt = definition.buildSystemPrompt();
    const userPrompt = definition.buildUserPrompt({
      userId: "user-1",
      profile: "forecast",
    });

    // Forecasts v3 (Phase 2): 6-8 cards — 5-6 realistic "What Could Go
    // Wrong" risks plus 1-2 unexpected opportunities, each with the same
    // three bullet sections and an honest confidence estimate.
    expect(systemPrompt).toContain("6 TO 8 FORECAST CARDS");
    expect(systemPrompt).toContain("risks: 5 or 6");
    expect(systemPrompt).toContain("opportunities: 1 or 2");
    expect(systemPrompt).toContain("what_could_happen");
    expect(systemPrompt).toContain("why_this");
    expect(systemPrompt).toContain("what_you_can_do");
    expect(systemPrompt).toContain("confidence");
    expect(systemPrompt).toContain("not fear-mongering");
    // Phase 3: forecasts are observable events, never emotional states, and
    // every section is exactly two bullets.
    expect(systemPrompt).toContain("EVENTS, NOT EMOTIONS");
    expect(systemPrompt).toContain("never an emotional or internal state");
    expect(systemPrompt).toContain("exactly 2");
    expect(userPrompt).toContain("risks (5 or 6 cards)");
    expect(userPrompt).toContain("opportunities (1 or 2 cards)");
    expect(userPrompt).toContain("what_could_happen (exactly 2 bullets)");
    expect(userPrompt).toContain("confidence (integer 0-100)");
  });

  it("requires check_in.generate to require theme and direction", () => {
    const definition = getPromptDefinition("check_in.generate");
    const systemPrompt = definition.buildSystemPrompt();
    const userPrompt = definition.buildUserPrompt({
      userId: "user-1",
      profile: "check_in",
    });

    expect(systemPrompt).toContain("strengthened");
    expect(systemPrompt).toContain("emerging");
    expect(systemPrompt).toContain("weakened");
    expect(systemPrompt).toContain("Never omit direction");
    expect(userPrompt).toContain("Never omit direction");
    expect(userPrompt).toContain('"direction"');
  });

  it("requires identity_update.generate to use approved update_type values", () => {
    const definition = getPromptDefinition("identity_update.generate");
    const systemPrompt = definition.buildSystemPrompt();
    const userPrompt = definition.buildUserPrompt({
      userId: "user-1",
      profile: "identity_update",
    });

    for (const updateType of APPROVED_IDENTITY_UPDATE_TYPES) {
      expect(systemPrompt).toContain(updateType);
      expect(userPrompt).toContain(updateType);
    }

    expect(systemPrompt).toContain("Never invent alternative labels");
    expect(userPrompt).toContain("Never invent update_type labels");
  });
});

describe("context limits", () => {
  it("truncates long reflection text to the hard limit", () => {
    const longReflection = "a".repeat(CONTEXT_LIMITS.TEXT.reflection + 50);
    const bundle = enforceContextLimits({
      userId: "user-1",
      profile: "check_in",
      reflection: longReflection,
    });

    expect(bundle.reflection?.length).toBeLessThanOrEqual(CONTEXT_LIMITS.TEXT.reflection);
  });

  it("caps total serialized context size", () => {
    const bundle = enforceContextLimits({
      userId: "user-1",
      profile: "timeline",
      timelineCheckIns: Array.from({ length: 20 }, (_, index) => ({
        id: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
        reflection: "x".repeat(500),
        theme_changes: [],
        identity_impact: "y".repeat(400),
        created_at: new Date().toISOString(),
      })),
    });

    expect(JSON.stringify(bundle).length).toBeLessThanOrEqual(
      CONTEXT_LIMITS.TOTAL_JSON_CHARS,
    );
  });
});
