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

  it("renders the headline", () => {
    expect(CARD_SOURCE).toContain("narrative.headline");
  });

  it("renders both opening paragraphs", () => {
    expect(CARD_SOURCE).toContain("narrative.openingBeginning");
    expect(CARD_SOURCE).toContain("narrative.openingEnd");
  });

  it("renders how-you-changed as a bullet list", () => {
    expect(CARD_SOURCE).toContain("narrative.howYouChanged");
    expect(CARD_SOURCE).toMatch(/[•][^\n]*\{change\}/);
  });

  it("renders why-this-changed as a paragraph", () => {
    expect(CARD_SOURCE).toContain("narrative.whyThisChanged");
  });
});

describe("MonthlyIdentityNarrativeCard — section order", () => {
  it("orders sections as: headline, opening, how you changed, why this changed", () => {
    const headlineIndex = CARD_SOURCE.indexOf("narrative.headline");
    const openingBeginningIndex = CARD_SOURCE.indexOf("narrative.openingBeginning");
    const openingEndIndex = CARD_SOURCE.indexOf("narrative.openingEnd");
    const howYouChangedIndex = CARD_SOURCE.indexOf("How you changed");
    const whyThisChangedIndex = CARD_SOURCE.indexOf("Why this changed");

    expect(headlineIndex).toBeGreaterThan(-1);
    expect(openingBeginningIndex).toBeGreaterThan(headlineIndex);
    expect(openingEndIndex).toBeGreaterThan(openingBeginningIndex);
    expect(howYouChangedIndex).toBeGreaterThan(openingEndIndex);
    expect(whyThisChangedIndex).toBeGreaterThan(howYouChangedIndex);
  });
});

describe("MonthlyIdentityNarrativeCard — no evidence-report sections", () => {
  it("does not render major decisions, future shifts, themes, or raw identity-shift evidence lists", () => {
    expect(CARD_SOURCE).not.toContain("majorDecisions");
    expect(CARD_SOURCE).not.toContain("futureShifts");
    expect(CARD_SOURCE).not.toContain("narrative.themes");
    expect(CARD_SOURCE).not.toContain("Future movements");
    expect(CARD_SOURCE).not.toContain("Major decisions");
  });
});

describe("MonthlyIdentityNarrativeCard — omits empty sections without fabricating content", () => {
  it("guards howYouChanged and whyThisChanged behind a truthy/length check", () => {
    expect(CARD_SOURCE).toContain("narrative.howYouChanged.length > 0");
    expect(CARD_SOURCE).toContain("narrative.whyThisChanged ?");
  });

  it("guards each opening paragraph independently", () => {
    expect(CARD_SOURCE).toContain("narrative.openingBeginning ?");
    expect(CARD_SOURCE).toContain("narrative.openingEnd ?");
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
