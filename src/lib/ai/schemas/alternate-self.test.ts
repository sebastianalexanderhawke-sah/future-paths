import { describe, expect, it } from "vitest";

import {
  alternateSelfOutputSchema,
  parseAlternateSelfOutput,
} from "@/lib/ai/schemas/alternate-self";

describe("alternate self output", () => {
  it("validates a non-null alternate self draft", () => {
    const draft = parseAlternateSelfOutput({
      name: "The Explorer",
      road_not_taken: "That path may have emphasized curiosity and independence.",
      alternate_self: "The Explorer may have emerged along that road.",
      what_remains_available: "Those qualities may still be available today.",
      themes: ["Curiosity", "Independence"],
    });

    expect(alternateSelfOutputSchema.parse(draft)).toEqual(draft);
  });

  it("rejects empty or incomplete drafts", () => {
    expect(() => parseAlternateSelfOutput({})).toThrow();
    expect(() => parseAlternateSelfOutput(null)).toThrow();
  });
});
