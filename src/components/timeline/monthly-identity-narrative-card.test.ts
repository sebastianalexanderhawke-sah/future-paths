import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Source-level assertions: verify what the MonthlyIdentityNarrativeCard
// renders, and that the Timeline page is built solely from
// MonthlyIdentityNarrative data with the old Life-Chapters/activity-feed
// rendering removed entirely. These complement live visual testing.

const CARD_SOURCE = readFileSync(
  resolve(__dirname, "monthly-identity-narrative-card.tsx"),
  "utf-8",
);

const PAGE_SOURCE = readFileSync(
  resolve(__dirname, "../../app/(protected)/timeline/page.tsx"),
  "utf-8",
);

describe("MonthlyIdentityNarrativeCard — present fields", () => {
  it("renders the month label", () => {
    expect(CARD_SOURCE).toContain("narrative.month");
  });

  it("renders the chapter-style title and summary", () => {
    expect(CARD_SOURCE).toContain("narrative.title");
    expect(CARD_SOURCE).toContain("narrative.summary");
  });

  it("renders themes as a single dot-separated line", () => {
    expect(CARD_SOURCE).toContain("narrative.themes");
    expect(CARD_SOURCE).toContain('" • "');
  });

  it("renders major decisions as a bullet list", () => {
    expect(CARD_SOURCE).toContain("narrative.majorDecisions");
    expect(CARD_SOURCE).toMatch(/[•][^\n]*\{decision\}/);
  });

  it("renders identity changes as a bullet list", () => {
    expect(CARD_SOURCE).toContain("narrative.identityChanges");
    expect(CARD_SOURCE).toMatch(/[•][^\n]*\{change\}/);
  });
});

describe("MonthlyIdentityNarrativeCard — month-over-month comparison", () => {
  it("renders the comparison section between the summary and Themes", () => {
    const summaryIndex = CARD_SOURCE.indexOf("narrative.summary");
    const comparisonIndex = CARD_SOURCE.indexOf("narrative.comparison");
    const themesHeadingIndex = CARD_SOURCE.indexOf("Themes</h4>");

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(comparisonIndex).toBeGreaterThan(summaryIndex);
    expect(themesHeadingIndex).toBeGreaterThan(comparisonIndex);
  });

  it("only renders when both a comparison and a previous month exist", () => {
    expect(CARD_SOURCE).toContain("narrative.comparison &&");
    expect(CARD_SOURCE).toContain("narrative.previousMonth &&");
  });

  it("labels the section with the previous month's name", () => {
    expect(CARD_SOURCE).toContain("Compared to {narrative.previousMonth.split");
  });

  it("renders increased items with an up arrow in emerald and decreased items with a down arrow in rose", () => {
    expect(CARD_SOURCE).toContain("narrative.comparison.increased.map");
    expect(CARD_SOURCE).toContain("narrative.comparison.decreased.map");
    expect(CARD_SOURCE).toMatch(/text-emerald-600[\s\S]*?↑ \{label\}/);
    expect(CARD_SOURCE).toMatch(/text-rose-600[\s\S]*?↓ \{label\}/);
  });
});

describe("MonthlyIdentityNarrativeCard — future shift styling", () => {
  it("uses an up arrow and a positive sign for gains, colored emerald", () => {
    expect(CARD_SOURCE).toContain('"↑"');
    expect(CARD_SOURCE).toContain("text-emerald-600");
  });

  it("uses a down arrow for losses, colored rose", () => {
    expect(CARD_SOURCE).toContain('"↓"');
    expect(CARD_SOURCE).toContain("text-rose-600");
  });

  it("branches on delta sign to choose arrow and color", () => {
    expect(CARD_SOURCE).toContain("shift.delta > 0");
  });
});

describe("MonthlyIdentityNarrativeCard — omits empty sections", () => {
  it("guards themes, majorDecisions, futureShifts, and identityChanges behind a length check", () => {
    expect(CARD_SOURCE).toContain("narrative.themes.length > 0");
    expect(CARD_SOURCE).toContain("narrative.majorDecisions.length > 0");
    expect(CARD_SOURCE).toContain("narrative.futureShifts.length > 0");
    expect(CARD_SOURCE).toContain("narrative.identityChanges.length > 0");
  });
});

describe("Timeline page — uses MonthlyIdentityNarrative as the sole data source", () => {
  it("loads monthly identity narratives", () => {
    expect(PAGE_SOURCE).toContain("loadMonthlyIdentityNarratives");
    expect(PAGE_SOURCE).toContain("MonthlyIdentityNarrativeCard");
  });

  it("removes the old Life Chapters / activity-feed rendering entirely", () => {
    expect(PAGE_SOURCE).not.toContain("listLifeChapters");
    expect(PAGE_SOURCE).not.toContain("LifeChapterCard");
    expect(PAGE_SOURCE).not.toContain("generateTimelineAction");
    expect(PAGE_SOURCE).not.toContain("deleteTimelineDevAction");
    expect(PAGE_SOURCE).not.toContain("TimelineEventCard");
  });

  it("shows an empty state when there are no monthly narratives", () => {
    expect(PAGE_SOURCE).toContain("narratives.length === 0");
  });

  it("surfaces a load error instead of silently rendering nothing", () => {
    expect(PAGE_SOURCE).toContain('"error" in result');
  });
});
