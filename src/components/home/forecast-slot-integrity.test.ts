import { describe, expect, it } from "vitest";

import { buildForecastSectionIntegrity } from "@/lib/forecast-slot-integrity";
import { processGeneratedForecastSections } from "@/components/home/forecast-reality";

describe("forecast slot integrity", () => {
  it("computes integrity score from unchanged survivors", () => {
    const integrity = buildForecastSectionIntegrity(
      [
        {
          raw: "She Says Yes To Coffee",
          survived: true,
          displayedTitle: "She Says Yes To Coffee",
          source: "survivor",
        },
        {
          raw: "The Ask Happens Over Lunch",
          survived: true,
          displayedTitle: "The Ask Happens Over Lunch",
          source: "survivor",
        },
      ],
      0,
      0,
    );

    expect(integrity.integrityScore).toBe(1);
    expect(integrity.replacements).toBe(0);
    expect(integrity.recoveryAdds).toBe(0);
    expect(integrity.fallbackAdds).toBe(0);
  });

  it("preserves all surviving active futures without adding fallback replacements", () => {
    const generated = {
      active: [
        {
          title: "She Says Yes To Coffee",
          why: "A direct ask after daily rapport can lead to plans quickly.",
          impact: "You meet outside work within the week.",
        },
        {
          title: "She Declines But Stays Warm",
          why: "A clear question can keep the friendship workable.",
          impact: "Daily work stays friendly even if romance fades.",
        },
        {
          title: "The Ask Happens Over Lunch",
          why: "A low-pressure lunch invite can feel natural at work.",
          impact: "The conversation moves outside the office routine.",
        },
        {
          title: "She Asks A Clarifying Question",
          why: "Mixed signals can prompt her to test interest directly.",
          impact: "You know where you stand sooner.",
        },
        {
          title: "A First Date Gets Planned",
          why: "Mutual interest often turns into concrete plans quickly.",
          impact: "You meet outside work within days.",
        },
      ],
      hidden: [
        {
          title: "Coworkers Notice The Dynamic",
          why: "Workplace chemistry rarely stays invisible.",
          impact: "Small talk feels different for a few weeks.",
        },
      ],
      blind_spots: [
        {
          title: "She Assumes You're Not Interested",
          why: "Platonic behavior can read as disinterest when she initiates often.",
          impact: "She stops looking for signs because the friendship feels settled.",
        },
      ],
    };

    const result = processGeneratedForecastSections(
      generated,
      "I like a girl at work",
      "How often does she initiate conversations?\nDaily",
      "Ask Her Out",
      ["Ask her out directly after work."],
      { collectPipelineTrace: true },
    );

    const displayedTitles = result.activeFutures.map((future) => future.title);

    expect(result.integrityAudit?.active.rawCount).toBe(5);
    expect(result.integrityAudit?.active.displayedCount).toBe(5);
    expect(result.integrityAudit?.active.replacements).toBe(0);
    expect(displayedTitles.length).toBe(5);
    expect(displayedTitles.length).toBeLessThanOrEqual(generated.active.length);
    expect(displayedTitles[0]).toBe("She Says Yes To Coffee");
    expect(displayedTitles[1]).toBe("She Declines But Stays Warm");
    expect(displayedTitles[3]).toBe("She Asks A Clarifying Question");
    expect(displayedTitles[4]).toBe("A First Date Gets Planned");
    expect(
      displayedTitles.some((title) => title === "You Keep Talking Every Week But Nothing Changes"),
    ).toBe(false);
  });
});
