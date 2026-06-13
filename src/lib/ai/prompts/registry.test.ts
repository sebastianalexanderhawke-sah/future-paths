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
  it("registers every migration-order prompt id at version 1", () => {
    expect(PROMPT_MIGRATION_ORDER).toHaveLength(12);

    for (const promptId of PROMPT_MIGRATION_ORDER) {
      const definition = getPromptDefinition(promptId);

      expect(definition.promptId).toBe(promptId);
      expect(definition.promptVersion).toBe("1");
      expect(definition.buildSystemPrompt().length).toBeGreaterThan(50);
      expect(definition.buildUserPrompt({ userId: "user-1", profile: promptId })).toContain(
        "Context JSON",
      );
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
    expect(systemPrompt).toContain("distinct strategies");
    expect(systemPrompt).toContain("inner landscape");
    expect(systemPrompt).toContain("What happens?");
  });

  it("requires future_self.discover to ban reflective forecast language", () => {
    const definition = getPromptDefinition("future_self.discover");
    const systemPrompt = definition.buildSystemPrompt();

    expect(systemPrompt).toContain("What happens?");
    expect(systemPrompt).toContain("inner landscape");
    expect(systemPrompt).toContain("gain clarity");
  });

  it("requires forecast.generate to produce dedicated future realities", () => {
    const definition = getPromptDefinition("forecast.generate");
    const systemPrompt = definition.buildSystemPrompt();
    const userPrompt = definition.buildUserPrompt({
      userId: "user-1",
      profile: "forecast",
    });

    expect(systemPrompt).toContain("What could actually happen next?");
    expect(systemPrompt).toContain("photograph");
    expect(systemPrompt).toContain("blind_spots");
    expect(userPrompt).toContain("active");
    expect(userPrompt).toContain("hidden");
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
