import { describe, expect, it } from "vitest";

import { FOCUS_AREA_LIMIT, tallyFocusAreas } from "@/lib/focus-areas";

// The Your Focus aggregation (Phase 4): theme mentions in, ranked LIFE-AREA
// attention out. Pinned behaviors: every mention lands in its mapped life
// area (Career, Relationships, Family, Health, Education, Finances,
// Personal Growth), existing vocabulary only, top-4 cap without padding,
// strongest-first with stable alphabetical ties, weights relative to the
// strongest area.

describe("tallyFocusAreas", () => {
  it("ranks life areas by how often recent entries touched them", () => {
    const areas = tallyFocusAreas([
      "Courage", // Personal Growth
      "Growth", // Personal Growth
      "Reflection", // Personal Growth
      "Connection", // Relationships
      "Belonging", // Relationships
      "Stability", // Finances
    ]);

    expect(areas.map((a) => a.theme)).toEqual([
      "Personal Growth",
      "Relationships",
      "Finances",
    ]);
    expect(areas[0]).toMatchObject({ mentions: 3, weight: 1 });
    expect(areas[1]?.weight).toBeCloseTo(2 / 3);
    expect(areas[2]?.weight).toBeCloseTo(1 / 3);
  });

  it("merges different themes that share a life area", () => {
    // Leadership and Independence both live in Career.
    const areas = tallyFocusAreas(["Leadership", "Independence"]);
    expect(areas).toHaveLength(1);
    expect(areas[0]).toMatchObject({ theme: "Career", mentions: 2 });
  });

  it("shows at most four areas and never invents filler", () => {
    const areas = tallyFocusAreas([
      "Courage", // Personal Growth
      "Connection", // Relationships
      "Stability", // Finances
      "Curiosity", // Education
      "Resilience", // Health
    ]);
    expect(areas).toHaveLength(FOCUS_AREA_LIMIT);

    // Two meaningful areas → exactly two rows.
    expect(tallyFocusAreas(["Courage", "Connection"])).toHaveLength(2);
    expect(tallyFocusAreas([])).toHaveLength(0);
  });

  it("keeps difficult themes — attention is attention", () => {
    // Loneliness and Hurt land in Relationships; Grief lands in Family.
    const areas = tallyFocusAreas(["Loneliness", "Hurt", "Grief"]);
    expect(areas[0]?.theme).toBe("Relationships");
    expect(areas[0]?.mentions).toBe(2);
    expect(areas[1]?.theme).toBe("Family");
  });

  it("only speaks the existing theme vocabulary", () => {
    const areas = tallyFocusAreas(["Courage", "Cryptocurrency", "Vibes"]);
    expect(areas.map((a) => a.theme)).toEqual(["Personal Growth"]);
  });

  it("breaks ties alphabetically so the order is stable between visits", () => {
    // One mention each in Finances, Relationships, and Personal Growth.
    const areas = tallyFocusAreas(["Stability", "Connection", "Courage"]);
    expect(areas.map((a) => a.theme)).toEqual([
      "Finances",
      "Personal Growth",
      "Relationships",
    ]);
  });
});
