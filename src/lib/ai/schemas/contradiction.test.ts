import { describe, expect, it } from "vitest";

import {
  contradictionOutputSchema,
  parseContradictionOutput,
} from "@/lib/ai/schemas/contradiction";

const CURRENT_SELF_ID = "11111111-1111-4111-8111-111111111111";
const FUTURE_SELF_ID = "22222222-2222-4222-8222-222222222222";
const PROMPT_RESPONSE_ID = "33333333-3333-4333-8333-333333333333";

const validDraft = {
  contradiction_type: "current_vs_future" as const,
  title: "Today and tomorrow may pull apart",
  summary: "You may feel tension between present patterns and an emerging future.",
  pole_a: "Current headline",
  pole_b: "Future self description",
  themes: ["Growth"],
  intensity: 60,
  source_refs: {
    current_self_id: CURRENT_SELF_ID,
    future_self_ids: [FUTURE_SELF_ID],
  },
  signature: `current_vs_future:${FUTURE_SELF_ID}`,
};

describe("contradiction output", () => {
  it("allows empty detect results for domain error handling", () => {
    expect(parseContradictionOutput([])).toEqual([]);
    expect(contradictionOutputSchema.parse([])).toEqual([]);
  });

  it("still validates non-empty contradiction drafts", () => {
    expect(() => parseContradictionOutput([{}])).toThrow();
  });

  it("normalizes invented Claude contradiction_type labels before schema validation", () => {
    const parsed = parseContradictionOutput([
      { ...validDraft, contradiction_type: "approach_avoidance" },
      {
        ...validDraft,
        contradiction_type: "values_conflict",
        signature: "dual_future:test",
      },
      {
        ...validDraft,
        contradiction_type: "identity_role_conflict",
        signature: "stated_vs_lived:test",
      },
    ]);

    expect(parsed[0].contradiction_type).toBe("current_vs_future");
    expect(parsed[1].contradiction_type).toBe("dual_future");
    expect(parsed[2].contradiction_type).toBe("stated_vs_lived");
  });

  it("coerces array source_refs into objects before schema validation", () => {
    const parsed = parseContradictionOutput([
      {
        ...validDraft,
        source_refs: [CURRENT_SELF_ID, FUTURE_SELF_ID],
      },
      {
        ...validDraft,
        contradiction_type: "dual_future",
        source_refs: [FUTURE_SELF_ID, PROMPT_RESPONSE_ID],
        signature: "dual_future:test",
      },
    ]);

    expect(parsed[0].source_refs).toEqual({
      current_self_id: CURRENT_SELF_ID,
      future_self_ids: [FUTURE_SELF_ID],
    });
    expect(parsed[1].source_refs).toEqual({
      future_self_ids: [FUTURE_SELF_ID, PROMPT_RESPONSE_ID],
    });
  });

  it("passes through approved values unchanged", () => {
    const parsed = parseContradictionOutput([validDraft]);

    expect(parsed[0].contradiction_type).toBe("current_vs_future");
    expect(parsed[0].source_refs).toEqual(validDraft.source_refs);
  });

  it("trims themes arrays to at most 3 items before schema validation", () => {
    const parsed = parseContradictionOutput([
      {
        ...validDraft,
        themes: ["Growth", "Courage", "Curiosity", "Independence"],
      },
    ]);

    expect(parsed[0].themes).toEqual(["Growth", "Courage", "Curiosity"]);
  });
});
