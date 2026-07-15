import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReflectionActivityCard } from "@/components/settings/reflection-activity";
import type { EngagementConsistency } from "@/lib/recent-activity";

// Behavioral tests for the Settings page's Reflection Activity card — after
// the UX polish (2026-07-15) a lightweight consistency summary: the
// "You've reflected on X of the last 7 days." sentence and a "See activity"
// link, nothing else. The Recent Activity feed, week strip, and weekly
// counts must never return — this section is a statement, not a dashboard.

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

function render(consistency = makeConsistency()): string {
  return renderToStaticMarkup(
    createElement(ReflectionActivityCard, { consistency }),
  );
}

describe("ReflectionActivityCard", () => {
  it("introduces itself with the reflected-days summary", () => {
    const html = render();
    expect(html).toContain("Reflection Activity");
    expect(html).toContain("How you&#x27;ve been using Reflection");
    expect(html).toContain("You&#x27;ve reflected on 5 of the last 7 days.");
  });

  it("links onward to the activity itself", () => {
    const html = render();
    expect(html).toContain("See activity →");
    expect(html).toContain('href="/reflections"');
  });

  it("stays honest on a quiet week", () => {
    const html = render(
      makeConsistency({
        weekDays: [false, false, false, false, false, false, false],
        activeDaysThisWeek: 0,
      }),
    );
    expect(html).toContain("You&#x27;ve reflected on 0 of the last 7 days.");
  });

  it("is a summary, not a dashboard — no feed, strip, or weekly counts", () => {
    const html = render();
    for (const removed of [
      "Recent Activity",
      "Consistency</p>",
      "this week",
      "View all activity",
      "Check-in completed",
      "Reflection written",
    ]) {
      expect(html).not.toContain(removed);
    }
    // No week-strip cells.
    expect(html).not.toContain("bg-[rgba(139,92,246,0.6)]");
  });

  it("never gamifies and shows no percentages or streaks", () => {
    const html = render();
    for (const word of [
      "🏆",
      "🔥",
      "Achievement",
      "Trophy",
      "Level",
      "Keep it up",
      "streak",
      "Streak",
    ]) {
      expect(html).not.toContain(word);
    }
    expect(html).not.toMatch(/\d+%\s*</);
  });
});
