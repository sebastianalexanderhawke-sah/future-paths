import { describe, expect, it } from "vitest";

import {
  futureSelfDiscoverOutputSchema,
  parseFutureSelfOutput,
} from "@/lib/ai/schemas/future-self";

describe("future self output", () => {
  it("allows empty discover results for reconciliation", () => {
    expect(parseFutureSelfOutput([])).toEqual([]);
    expect(futureSelfDiscoverOutputSchema.parse([])).toEqual([]);
  });

  it("still requires at least one draft when output is non-empty", () => {
    expect(() => parseFutureSelfOutput([{}])).toThrow();
  });
});
