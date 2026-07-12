import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RecentActivityCard } from "@/components/overview/recent-activity-card";
import type { FocusArea } from "@/lib/focus-areas";
import type { EngagementActivity } from "@/lib/recent-activity";

// Behavioral tests: render the Overview's engagement snapshot with fixture
// data and assert on what the user reads — steadiness, focus, and the feed
// — plus what this card must never become (gamified, multicolored, padded).

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function makeActivity(overrides: Partial<EngagementActivity> = {}): EngagementActivity {
  return {
    consistency: {
      weekDays: [true, false, true, true, false, true, true],
      activeDaysThisWeek: 5,
      currentStreak: 4,
      longestStreak: 12,
    },
    items: [
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
      {
        id: "situation-1",
        kind: "situation",
        situationTitle: "Should I quit soccer",
        occurredAt: daysAgo(5),
      },
    ],
    ...overrides,
  };
}

function makeFocusAreas(): FocusArea[] {
  return [
    { theme: "Courage", weight: 1, mentions: 5 },
    { theme: "Connection", weight: 0.6, mentions: 3 },
  ];
}

function render(
  activity: EngagementActivity = makeActivity(),
  focusAreas: FocusArea[] = makeFocusAreas(),
): string {
  return renderToStaticMarkup(
    createElement(RecentActivityCard, { activity, focusAreas }),
  );
}

describe("RecentActivityCard structure", () => {
  it("introduces itself as the engagement snapshot", () => {
    const html = render();
    expect(html).toContain("Recent Activity");
    expect(html).toContain("How you&#x27;ve been engaging with Reflection lately");
  });

  it("reads consistency → your focus → recently active", () => {
    const html = render();
    const consistency = html.indexOf("Consistency");
    const focus = html.indexOf("Your Focus");
    const recent = html.indexOf("Recently Active");
    expect(consistency).toBeGreaterThan(-1);
    expect(focus).toBeGreaterThan(consistency);
    expect(recent).toBeGreaterThan(focus);
  });

  it("links onward to all activity", () => {
    const html = render();
    expect(html).toContain("View all activity →");
    expect(html).toContain('href="/reflections"');
  });
});

describe("RecentActivityCard consistency", () => {
  it("states the week and streaks as plain observations", () => {
    const html = render();
    expect(html).toContain("5 active days this week");
    expect(html).toContain("Current streak");
    expect(html).toContain("4 days");
    expect(html).toContain("Longest streak");
    expect(html).toContain("12 days");
  });

  it("speaks singular when a streak is one day", () => {
    const html = render(
      makeActivity({
        consistency: {
          weekDays: [false, false, false, false, false, false, true],
          activeDaysThisWeek: 1,
          currentStreak: 1,
          longestStreak: 1,
        },
      }),
    );
    expect(html).toContain("1 active day this week");
    expect(html).toContain("1 day");
  });

  it("never gamifies", () => {
    const html = render();
    for (const word of ["🏆", "🔥", "Achievement", "Trophy", "Level", "Keep it up"]) {
      expect(html).not.toContain(word);
    }
  });
});

describe("RecentActivityCard feed", () => {
  it("phrases each activity as something the person did, newest first", () => {
    const html = render();
    const reflected = html.indexOf("Reflected on “Starting a business”");
    const checkedIn = html.indexOf("Checked in on “Moving to Dallas”");
    const chose = html.indexOf("Chose a path in “Should I quit soccer”");
    const started = html.indexOf("Started exploring “Should I quit soccer”");
    expect(reflected).toBeGreaterThan(-1);
    expect(checkedIn).toBeGreaterThan(reflected);
    expect(chose).toBeGreaterThan(checkedIn);
    expect(started).toBeGreaterThan(chose);
  });

  it("dates activities with the product's relative-time voice", () => {
    const html = render();
    expect(html).toContain("today");
    expect(html).toContain("1 day ago");
    expect(html).toContain("3 days ago");
  });

  it("stays honest when nothing has been recorded", () => {
    const html = render(makeActivity({ items: [] }), []);
    expect(html).toContain("Nothing recorded yet");
    expect(html).toContain("Not enough recent entries");
  });
});

describe("RecentActivityCard visual restraint", () => {
  it("keeps purple as the only accent", () => {
    const html = render();
    expect(html).toContain("139,92,246");
    expect(html).not.toContain("#10b981");
    expect(html).not.toContain("#f43f5e");
  });

  it("keeps focus bars relative and word-labeled", () => {
    const html = render();
    expect(html).toContain("width:100%");
    expect(html).toContain("Courage");
    expect(html).toContain("5 recent moments of attention"); // aria only
  });
});
