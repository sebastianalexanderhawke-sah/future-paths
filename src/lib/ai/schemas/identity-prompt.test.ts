import { describe, expect, it } from "vitest";

import {
  identityPromptDiscoverOutputSchema,
  parseIdentityPromptOutput,
} from "@/lib/ai/schemas/identity-prompt";

describe("identity prompt output", () => {
  it("allows empty discover results for domain error handling", () => {
    expect(parseIdentityPromptOutput([])).toEqual([]);
    expect(identityPromptDiscoverOutputSchema.parse([])).toEqual([]);
  });

  it("still requires at least one draft when output is non-empty", () => {
    expect(() => parseIdentityPromptOutput([{}])).toThrow();
  });
});
