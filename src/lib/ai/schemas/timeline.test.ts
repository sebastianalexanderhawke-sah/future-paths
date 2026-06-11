import { describe, expect, it } from "vitest";

import {
  parseTimelineOutput,
  timelineDiscoverOutputSchema,
} from "@/lib/ai/schemas/timeline";

const sampleEvidence = {
  evidence_type: "moment" as const,
  evidence_id: "550e8400-e29b-41d4-a716-446655440000",
  label: "A meaningful moment",
  occurred_at: "2024-01-15T00:00:00.000Z",
  sort_priority: 80,
};

const sampleChapter = {
  title: "Stretching Into Something New",
  period_label: "2024-Q1",
  starts_at: "2024-01-01",
  ends_at: "2024-03-31",
  summary:
    "You may have been navigating Growth during this period — not as a single decision, but as a recurring thread.",
  themes: ["Growth"],
  includes_current_self: false,
  evidence: [sampleEvidence],
  strength: 12,
};

describe("timeline output", () => {
  it("allows empty discover results for insufficient-signal handling", () => {
    expect(parseTimelineOutput([])).toEqual([]);
    expect(timelineDiscoverOutputSchema.parse([])).toEqual([]);
  });

  it("still validates non-empty chapter drafts", () => {
    expect(() => parseTimelineOutput([{}])).toThrow();
  });

  it("normalizes invented Claude themes before schema validation", () => {
    const parsed = parseTimelineOutput([
      {
        ...sampleChapter,
        themes: ["Roots", "Discovery", "Purpose"],
      },
    ]);

    expect(parsed[0].themes).toEqual(["Belonging", "Curiosity", "Reflection"]);
  });

  it("fills missing optional-like chapter fields before schema validation", () => {
    const parsed = parseTimelineOutput([
      {
        title: sampleChapter.title,
        period_label: sampleChapter.period_label,
        starts_at: sampleChapter.starts_at,
        ends_at: sampleChapter.ends_at,
        summary: sampleChapter.summary,
        themes: ["Adaptability", "Honesty", "Commitment"],
        evidence: [
          {
            evidence_type: "check_in",
            evidence_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            label: "A check-in reflection",
            occurred_at: "2024-02-01T00:00:00.000Z",
          },
        ],
      },
    ]);

    expect(parsed[0].themes).toEqual(["Growth", "Courage", "Stability"]);
    expect(parsed[0].includes_current_self).toBe(false);
    expect(parsed[0].strength).toBe(0);
    expect(parsed[0].evidence[0].sort_priority).toBe(100);
  });
});
