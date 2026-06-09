import { describe, expect, it } from "vitest";

import { CONTEXT_LIMITS } from "@/lib/ai/context/limits";
import { enforceContextLimits } from "@/lib/ai/context/truncate";
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
    expect(PROMPT_MIGRATION_ORDER).toHaveLength(10);

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
