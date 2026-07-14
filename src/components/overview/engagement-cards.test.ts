import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  weekDayLetters,
  YourActivityCard,
} from "@/components/overview/your-activity-card";
import {
  ACTIVITY_FEED_LIMIT,
  countWeeklyActivity,
  type EngagementActivityItem,
  type EngagementConsistency,
  type WeeklyActivityCounts,
} from "@/lib/recent-activity";

// Behavioral tests for the Overview's Your Activity card (Phase 4, IA
// refinement 2026-07-14): one elevated pulse-check card with two
// side-by-side sections — Recent Activity (a chronological feed across
// every feature: what happened, where, when) → Consistency — asserted on
// what the user reads, plus what this card must never become (gamified,
// multicolored, percentage-laden). The old Your Focus section moved to the
// Situations page.

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
      href: "/moments/m1",
    },
    {
      id: "check-in-2",
      kind: "check-in",
      situationTitle: "Moving to Dallas",
      occurredAt: daysAgo(1),
      href: "/moments/m2",
    },
    {
      id: "path-1",
      kind: "path",
      situationTitle: "Should I quit soccer",
      occurredAt: daysAgo(3),
      href: "/moments/m3",
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

function makeWeeklyCounts(
  overrides: Partial<WeeklyActivityCounts> = {},
): WeeklyActivityCounts {
  return { reflections: 5, checkIns: 2, pathsChosen: 3, ...overrides };
}

function render({
  items = makeItems(),
  consistency = makeConsistency(),
  weeklyCounts = makeWeeklyCounts(),
}: {
  items?: EngagementActivityItem[];
  consistency?: EngagementConsistency;
  weeklyCounts?: WeeklyActivityCounts;
} = {}): string {
  return renderToStaticMarkup(
    createElement(YourActivityCard, { items, consistency, weeklyCounts }),
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

  it("reads Recent Activity → Consistency, with no Your Focus section", () => {
    const html = render();
    const recent = html.indexOf("Recent Activity");
    const consistency = html.indexOf("Consistency");
    expect(recent).toBeGreaterThan(-1);
    expect(consistency).toBeGreaterThan(recent);
    expect(html).not.toContain("Your Focus");
  });
});

describe("YourActivityCard — Recent Activity feed", () => {
  it("tells each row as what happened → where → in chronological order", () => {
    const html = render();
    const reflected = html.indexOf("Reflection written");
    const business = html.indexOf("Starting a business");
    const checkedIn = html.indexOf("Check-in completed");
    const dallas = html.indexOf("Moving to Dallas");
    const chose = html.indexOf("Future Path selected");
    const soccer = html.indexOf("Should I quit soccer");
    expect(reflected).toBeGreaterThan(-1);
    expect(business).toBeGreaterThan(reflected);
    expect(checkedIn).toBeGreaterThan(business);
    expect(dallas).toBeGreaterThan(checkedIn);
    expect(chose).toBeGreaterThan(dallas);
    expect(soccer).toBeGreaterThan(chose);
  });

  it("dates activities with the product's relative-time voice", () => {
    const html = render();
    expect(html).toContain("today");
    expect(html).toContain("1 day ago");
    expect(html).toContain("3 days ago");
  });

  it("covers the non-situation features with their own labels and places", () => {
    const html = render({
      items: [
        {
          id: "forecast-1",
          kind: "forecast",
          situationTitle: "Starting a business",
          occurredAt: daysAgo(0),
          href: "/moments/m1",
        },
        {
          id: "future-self-1",
          kind: "future-self",
          situationTitle: "Independent Builder",
          occurredAt: daysAgo(1),
          href: "/future-selves",
        },
        {
          id: "chapter-July 2026",
          kind: "chapter",
          situationTitle: "July 2026",
          occurredAt: daysAgo(2),
          href: "/timeline",
        },
      ],
    });
    expect(html).toContain("Future Forecast generated");
    expect(html).toContain("Future Self updated");
    expect(html).toContain("Future Selves · Independent Builder");
    expect(html).toContain("Timeline chapter created");
    expect(html).toContain("Timeline · July 2026");
    expect(html).toContain('href="/future-selves"');
    expect(html).toContain('href="/timeline"');
  });

  it(`renders exactly ${ACTIVITY_FEED_LIMIT} rows even when more items arrive`, () => {
    const extra: EngagementActivityItem[] = [
      ...makeItems(),
      {
        id: "situation-4",
        kind: "situation",
        situationTitle: "Learning piano",
        occurredAt: daysAgo(4),
      },
      {
        id: "situation-5",
        kind: "situation",
        situationTitle: "Adopting a dog",
        occurredAt: daysAgo(5),
      },
    ];
    const html = render({ items: extra });
    expect(html).toContain("Should I quit soccer");
    expect(html).not.toContain("Learning piano");
    expect(html).not.toContain("Adopting a dog");
  });

  it("links each row to where the activity happened", () => {
    const html = render();
    expect(html).toContain('href="/moments/m1"');
    expect(html).toContain('href="/moments/m2"');
    expect(html).toContain('href="/moments/m3"');
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
