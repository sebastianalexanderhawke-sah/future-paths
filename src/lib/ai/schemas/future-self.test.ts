import { describe, expect, it } from "vitest";

import {
  futureSelfDiscoverOutputSchema,
  parseFutureSelfOutput,
} from "@/lib/ai/schemas/future-self";

const validDraft = {
  name: "The Builder",
  description: "You may be becoming someone who grows steadily.",
  stage: "emerging" as const,
  momentum: 75,
  themes: ["Growth"],
};

describe("future self output", () => {
  it("allows empty discover results for reconciliation", () => {
    expect(parseFutureSelfOutput([])).toEqual([]);
    expect(futureSelfDiscoverOutputSchema.parse([])).toEqual([]);
  });

  it("still requires at least one draft when output is non-empty", () => {
    expect(() => parseFutureSelfOutput([{}])).toThrow();
  });

  it("normalizes invented Claude stage labels before schema validation", () => {
    const parsed = parseFutureSelfOutput([
      { ...validDraft, stage: "developing" },
      { ...validDraft, name: "The Pioneer", stage: "forming", themes: ["Courage"] },
    ]);

    expect(parsed[0].stage).toBe("emerging");
    expect(parsed[1].stage).toBe("possible");
  });

  it("passes through approved stage values unchanged", () => {
    const parsed = parseFutureSelfOutput([
      { ...validDraft, stage: "possible" },
      { ...validDraft, stage: "future_self" },
    ]);

    expect(parsed[0].stage).toBe("possible");
    expect(parsed[1].stage).toBe("future_self");
  });
});
