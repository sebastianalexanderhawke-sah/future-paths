import { describe, expect, it } from "vitest";

import { FOCUS_AREA_LIMIT, tallyFocusAreas } from "@/lib/focus-areas";

// The Your Focus aggregation: theme mentions in, ranked relative attention
// out. Pinned behaviors: existing vocabulary only, top-4 cap without
// padding, strongest-first with stable alphabetical ties, weights relative
// to the strongest area.

describe("tallyFocusAreas", () => {
  it("ranks areas by how often recent entries mentioned them", () => {
    const areas = tallyFocusAreas([
      "Courage",
      "Courage",
      "Courage",
      "Connection",
      "Connection",
      "Stability",
    ]);

    expect(areas.map((a) => a.theme)).toEqual([
      "Courage",
      "Connection",
      "Stability",
    ]);
    expect(areas[0]).toMatchObject({ mentions: 3, weight: 1 });
    expect(areas[1]?.weight).toBeCloseTo(2 / 3);
    expect(areas[2]?.weight).toBeCloseTo(1 / 3);
  });

  it("shows at most four areas and never invents filler", () => {
    const areas = tallyFocusAreas([
      "Courage",
      "Connection",
      "Stability",
      "Growth",
      "Curiosity",
    ]);
    expect(areas).toHaveLength(FOCUS_AREA_LIMIT);

    // Two meaningful areas → exactly two rows.
    expect(tallyFocusAreas(["Courage", "Connection"])).toHaveLength(2);
    expect(tallyFocusAreas([])).toHaveLength(0);
  });

  it("keeps difficult themes — attention is attention", () => {
    const areas = tallyFocusAreas(["Uncertainty", "Uncertainty", "Courage"]);
    expect(areas[0]?.theme).toBe("Uncertainty");
  });

  it("only speaks the existing theme vocabulary", () => {
    const areas = tallyFocusAreas(["Courage", "Cryptocurrency", "Vibes"]);
    expect(areas.map((a) => a.theme)).toEqual(["Courage"]);
  });

  it("breaks ties alphabetically so the order is stable between visits", () => {
    const areas = tallyFocusAreas(["Stability", "Connection", "Courage"]);
    expect(areas.map((a) => a.theme)).toEqual([
      "Connection",
      "Courage",
      "Stability",
    ]);
  });
});
