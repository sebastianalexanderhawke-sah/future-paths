import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  weekDayLetters,
  YourActivityCard,
} from "@/components/overview/your-activity-card";
import { buildFocusInsight, type FocusArea } from "@/lib/focus-areas";
import {
  countWeeklyActivity,
  type EngagementActivityItem,
  type EngagementConsistency,
  type WeeklyActivityCounts,
} from "@/lib/recent-activity";

// Behavioral tests for the Overview's Your Activity card (Phase 4): one
// elevated pulse-check card with three side-by-side sections — Recently
// Active → Consistency → Your Focus — asserted on what the user reads,
// plus what this card must never become (gamified, multicolored,
// percentage-laden).

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function makeItems(): EngagementActivityItem[] {
  return [
    {
      id: "check-in-1",
      kind: "reflection",
      situationTitle: "Starting a business",
      occurredAt: daysAgo(0),
    },
    {
      id: "check-in-2",
      kind: "check-in",
      situationTitle: "Moving to Dallas",
      occurredAt: daysAgo(1),
    },
    {
      id: "path-1",
      kind: "path",
      situationTitle: "Should I quit soccer",
      occurredAt: daysAgo(3),
    },
  ];
}

function makeConsistency(
  overrides: Partial<EngagementConsistency> = {},
): EngagementConsistency {
  return {
    weekDays: [true, true, true, false, true, false, true],
    activeDaysThisWeek: 5,
    currentStreak: 1,
    longestStreak: 4,
    ...overrides,
  };
}

function makeFocusAreas(): FocusArea[] {
  return [
    { theme: "Career", weight: 1, mentions: 5 },
    { theme: "Relationships", weight: 0.6, mentions: 3 },
  ];
}

function makeWeeklyCounts(
  overrides: Partial<WeeklyActivityCounts> = {},
): WeeklyActivityCounts {
  return { reflections: 5, checkIns: 2, pathsChosen: 3, ...overrides };
}

function render({
  items = makeItems(),
  consistency = makeConsistency(),
  weeklyCounts = makeWeeklyCounts(),
  focusAreas = makeFocusAreas(),
  insight = buildFocusInsight(focusAreas),
}: {
  items?: EngagementActivityItem[];
  consistency?: EngagementConsistency;
  weeklyCounts?: WeeklyActivityCounts;
  focusAreas?: FocusArea[];
  insight?: string | null;
} = {}): string {
  return renderToStaticMarkup(
    createElement(YourActivityCard, {
      items,
      consistency,
      weeklyCounts,
      focusAreas,
      insight,
    }),
  );
}

describe("YourActivityCard structure", () => {
  it("introduces itself as the activity snapshot", () => {
    const html = render();
    expect(html).toContain("Your Activity");
    expect(html).toContain(
      "A quick snapshot of how you&#x27;ve been engaging with Reflection recently",
    );
  });

  it("reads Recently Active → Consistency → Your Focus", () => {
    const html = render();
    const recent = html.indexOf("Recently Active");
    const consistency = html.indexOf("Consistency");
    const focus = html.indexOf("Your Focus");
    expect(recent).toBeGreaterThan(-1);
    expect(consistency).toBeGreaterThan(recent);
    expect(focus).toBeGreaterThan(consistency);
  });
});

describe("YourActivityCard — Recently Active", () => {
  it("phrases each activity as something the person did, newest first", () => {
    const html = render();
    const reflected = html.indexOf("Reflected on “Starting a business”");
    const checkedIn = html.indexOf("Checked in on “Moving to Dallas”");
    const chose = html.indexOf("Chose a path in “Should I quit soccer”");
    expect(reflected).toBeGreaterThan(-1);
    expect(checkedIn).toBeGreaterThan(reflected);
    expect(chose).toBeGreaterThan(checkedIn);
  });

  it("dates activities with the product's relative-time voice", () => {
    const html = render();
    expect(html).toContain("today");
    expect(html).toContain("1 day ago");
    expect(html).toContain("3 days ago");
  });

  it("stays honest when nothing has been recorded, and links onward", () => {
    const html = render({ items: [] });
    expect(html).toContain("Nothing recorded yet");
    expect(html).toContain("View all activity →");
    expect(html).toContain('href="/reflections"');
  });
});

describe("YourActivityCard — Consistency", () => {
  it("shows a seven-day strip and the summary sentence", () => {
    const html = render();
    expect(html).toContain("Active 5 of the last 7 days");
    expect(html).toContain("been active 5 of the last 7 days.");
    // Seven cells: five filled, two empty.
    expect(html.match(/bg-\[rgba\(139,92,246,0\.6\)\] ?/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("shows the three compact weekly statistics", () => {
    const html = render();
    const reflections = html.indexOf("Reflections");
    const checkIns = html.indexOf("Check-ins");
    const paths = html.indexOf("Paths Chosen");
    expect(reflections).toBeGreaterThan(-1);
    expect(checkIns).toBeGreaterThan(reflections);
    expect(paths).toBeGreaterThan(checkIns);
    expect(html).toContain("5 this week");
    expect(html).toContain("2 this week");
    expect(html).toContain("3 this week");
  });

  it("stays honest on a quiet week", () => {
    const html = render({
      consistency: makeConsistency({
        weekDays: [false, false, false, false, false, false, false],
        activeDaysThisWeek: 0,
      }),
    });
    expect(html).toContain("A quiet week so far");
  });

  it("never gamifies and shows no percentages or streaks", () => {
    const html = render();
    for (const word of ["🏆", "🔥", "Achievement", "Trophy", "Level", "Keep it up", "streak", "Streak"]) {
      expect(html).not.toContain(word);
    }
    expect(html).not.toMatch(/\d+%\s*</);
  });
});

describe("YourActivityCard — Your Focus", () => {
  it("shows life-area bars and the insight sentence", () => {
    const html = render();
    expect(html).toContain("Career");
    expect(html).toContain("Relationships");
    expect(html).toContain("width:100%");
    expect(html).toContain(
      "Your attention has been split mainly between Career and Relationships.",
    );
  });

  it("stays honest when there is not enough data", () => {
    const html = render({ focusAreas: [], insight: null });
    expect(html).toContain("Not enough recent entries");
  });

  it("keeps violet as the only accent", () => {
    const html = render();
    expect(html).toContain("139,92,246");
    expect(html).not.toContain("#10b981");
    expect(html).not.toContain("#f43f5e");
  });
});

describe("weekDayLetters", () => {
  it("labels the rolling window oldest → today with UTC weekday letters", () => {
    // 2026-07-12 is a Sunday (UTC), so the strip ends on S and starts the
    // previous Monday.
    const letters = weekDayLetters(new Date("2026-07-12T12:00:00Z"));
    expect(letters).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });

  it("rolls with the current day rather than pinning a calendar week", () => {
    // A Wednesday: window is Thu → Wed.
    const letters = weekDayLetters(new Date("2026-07-08T12:00:00Z"));
    expect(letters).toEqual(["T", "F", "S", "S", "M", "T", "W"]);
  });
});

describe("buildFocusInsight", () => {
  const area = (theme: string, weight: number, mentions = 1): FocusArea => ({
    theme,
    weight,
    mentions,
  });

  it("returns null with no areas", () => {
    expect(buildFocusInsight([])).toBeNull();
  });

  it("names a single focus", () => {
    expect(buildFocusInsight([area("Career", 1)])).toBe(
      "Nearly all of your recent attention has gone to Career.",
    );
  });

  it("calls out a dominant leader", () => {
    expect(buildFocusInsight([area("Career", 1), area("Health", 0.4)])).toBe(
      "Career has been pulling most of your attention lately, well ahead of Health.",
    );
  });

  it("describes an even three-way spread", () => {
    expect(
      buildFocusInsight([
        area("Career", 1),
        area("Family", 0.9),
        area("Relationships", 0.8),
      ]),
    ).toBe(
      "Your attention has been spread fairly evenly across Career, Family, and Relationships.",
    );
  });

  it("describes a leading pair with background", () => {
    expect(
      buildFocusInsight([
        area("Career", 1),
        area("Family", 0.8),
        area("Finances", 0.3),
      ]),
    ).toBe(
      "Career and Family have been leading your attention, with Finances in the background.",
    );
  });
});

describe("countWeeklyActivity", () => {
  it("counts events per kind within the last seven days", () => {
    const now = new Date("2026-07-12T12:00:00Z");
    const counts = countWeeklyActivity(
      {
        reflections: [
          "2026-07-12T08:00:00Z",
          "2026-07-12T09:00:00Z", // same day — events still count separately
          "2026-07-01T08:00:00Z", // outside the window
        ],
        checkIns: ["2026-07-10T08:00:00Z"],
        pathsChosen: ["2026-07-09T08:00:00Z", "2026-07-06T08:00:00Z"],
      },
      now,
    );

    expect(counts.reflections).toBe(2);
    expect(counts.checkIns).toBe(1);
    expect(counts.pathsChosen).toBe(2);
  });

  it("ignores unparseable timestamps", () => {
    const counts = countWeeklyActivity(
      { reflections: ["not-a-date"], checkIns: [], pathsChosen: [] },
      new Date("2026-07-12T12:00:00Z"),
    );
    expect(counts.reflections).toBe(0);
  });
});
