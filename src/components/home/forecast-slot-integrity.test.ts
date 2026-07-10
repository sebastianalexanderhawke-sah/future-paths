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
        {
          title: "She Assumes You're Not Interested",
          why: "Platonic behavior can read as disinterest when she initiates often.",
          impact: "She stops looking for signs because the friendship feels settled.",
        },
        {
          title: "The Timing Never Aligns",
          why: "Busy schedules can keep things polite but static.",
          impact: "Months pass without a clear moment to act.",
        },
      ],
      blind_spots: [],
      wild_card: [
        {
          title: "She Transfers To Another Team",
          why: "Internal moves change daily proximity without ending contact.",
          impact: "You have to choose to stay in touch deliberately.",
        },
        {
          title: "A Mutual Friend Changes The Dynamic",
          why: "Shared social ties can shift how you both act at work.",
          impact: "Group plans replace one-on-one contact.",
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

    expect(result.integrityAudit?.active.rawCount).toBe(3);
    expect(result.integrityAudit?.active.displayedCount).toBe(3);
    expect(result.integrityAudit?.active.replacements).toBe(0);
    expect(displayedTitles.length).toBe(3);
    expect(displayedTitles.length).toBeLessThanOrEqual(generated.active.length);
    expect(displayedTitles[0]).toBe("She Says Yes To Coffee");
    expect(displayedTitles[1]).toBe("She Declines But Stays Warm");
    expect(displayedTitles[2]).toBe("A First Date Gets Planned");
    expect(
      displayedTitles.some((title) => title === "You Keep Talking Every Week But Nothing Changes"),
    ).toBe(false);
  });
});
