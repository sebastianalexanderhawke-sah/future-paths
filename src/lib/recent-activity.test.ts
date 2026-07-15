import { describe, expect, it } from "vitest";

import { summarizeConsistency } from "@/lib/recent-activity";

// Consistency is observational arithmetic over existing timestamps — these
// tests pin the day bucketing and the yesterday grace on the current streak.

const NOW = new Date("2026-07-11T18:00:00.000Z");

function daysAgo(days: number, hour = 9): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("summarizeConsistency", () => {
  it("counts distinct active days in the last seven", () => {
    const summary = summarizeConsistency(
      [daysAgo(0), daysAgo(0, 20), daysAgo(2), daysAgo(4), daysAgo(6)],
      NOW,
    );
    expect(summary.activeDaysThisWeek).toBe(4);
    expect(summary.weekDays).toEqual([
      true, // 6 days ago
      false,
      true, // 4 days ago
      false,
      true, // 2 days ago
      false,
      true, // today
    ]);
  });

  it("runs the current streak through today", () => {
    const summary = summarizeConsistency(
      [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4)],
      NOW,
    );
    expect(summary.currentStreak).toBe(3);
  });

  it("does not zero the streak on a quiet morning — yesterday still counts", () => {
    const summary = summarizeConsistency([daysAgo(1), daysAgo(2)], NOW);
    expect(summary.currentStreak).toBe(2);
  });

  it("breaks the current streak after a full missed day", () => {
    const summary = summarizeConsistency([daysAgo(2), daysAgo(3)], NOW);
    expect(summary.currentStreak).toBe(0);
  });

  it("finds the longest streak anywhere in history", () => {
    const summary = summarizeConsistency(
      [daysAgo(0), daysAgo(10), daysAgo(11), daysAgo(12), daysAgo(13)],
      NOW,
    );
    expect(summary.longestStreak).toBe(4);
    expect(summary.currentStreak).toBe(1);
  });

  it("stays calm on an empty history", () => {
    const summary = summarizeConsistency([], NOW);
    expect(summary).toMatchObject({
      activeDaysThisWeek: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(summary.weekDays).toEqual([false, false, false, false, false, false, false]);
  });
});

