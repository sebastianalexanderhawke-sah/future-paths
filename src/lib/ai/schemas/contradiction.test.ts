import { describe, expect, it } from "vitest";

import {
  contradictionOutputSchema,
  parseContradictionOutput,
} from "@/lib/ai/schemas/contradiction";

describe("contradiction output", () => {
  it("allows empty detect results for domain error handling", () => {
    expect(parseContradictionOutput([])).toEqual([]);
    expect(contradictionOutputSchema.parse([])).toEqual([]);
  });

  it("still validates non-empty contradiction drafts", () => {
    expect(() => parseContradictionOutput([{}])).toThrow();
  });
});
