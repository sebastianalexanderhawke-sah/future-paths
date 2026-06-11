import { describe, expect, it } from "vitest";

import {
  identityPromptDiscoverOutputSchema,
  parseIdentityPromptOutput,
} from "@/lib/ai/schemas/identity-prompt";

const validDraft = {
  prompt_type: "theme_reflection" as const,
  question: "You may be expressing growth more often lately. When did you last notice that showing up?",
  context: "This may connect to themes appearing across your chosen paths and check-ins.",
  themes: ["Growth"],
};

describe("identity prompt output", () => {
  it("allows empty discover results for domain error handling", () => {
    expect(parseIdentityPromptOutput([])).toEqual([]);
    expect(identityPromptDiscoverOutputSchema.parse([])).toEqual([]);
  });

  it("still requires at least one draft when output is non-empty", () => {
    expect(() => parseIdentityPromptOutput([{}])).toThrow();
  });

  it("normalizes invented Claude prompt_type labels before schema validation", () => {
    const parsed = parseIdentityPromptOutput([
      { ...validDraft, prompt_type: "pattern_reflection" },
      {
        ...validDraft,
        prompt_type: "tension_exploration",
        question: "What tension may be worth exploring?",
      },
      {
        ...validDraft,
        prompt_type: "identity_signal",
        question: "What signal may be emerging in your patterns?",
      },
    ]);

    expect(parsed[0].prompt_type).toBe("pattern_probe");
    expect(parsed[1].prompt_type).toBe("theme_reflection");
    expect(parsed[2].prompt_type).toBe("pattern_probe");
  });

  it("passes through approved prompt_type values unchanged", () => {
    const parsed = parseIdentityPromptOutput([
      { ...validDraft, prompt_type: "theme_reflection" },
      { ...validDraft, prompt_type: "future_alignment" },
      { ...validDraft, prompt_type: "pattern_probe" },
    ]);

    expect(parsed[0].prompt_type).toBe("theme_reflection");
    expect(parsed[1].prompt_type).toBe("future_alignment");
    expect(parsed[2].prompt_type).toBe("pattern_probe");
  });
});
