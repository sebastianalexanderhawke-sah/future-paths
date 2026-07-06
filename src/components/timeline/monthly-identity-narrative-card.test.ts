import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";

// Behavioral tests: render the MonthlyIdentityNarrativeCard and the Timeline
// page with fixture narratives and assert on the visible output — headline,
// paragraphs, change rows, evidence counts — instead of on component source.

const {
  getUserIdentityMock,
  getUnansweredReflectionSummaryMock,
  loadMonthlyIdentityNarrativesMock,
} = vi.hoisted(() => ({
  getUserIdentityMock: vi.fn(),
  getUnansweredReflectionSummaryMock: vi.fn(),
  loadMonthlyIdentityNarrativesMock: vi.fn(),
}));

vi.mock("@/lib/user-identity", () => ({
  getUserIdentity: getUserIdentityMock,
}));
vi.mock("@/lib/reflections", () => ({
  getUnansweredReflectionSummary: getUnansweredReflectionSummaryMock,
}));
vi.mock("@/lib/monthly-identity-narrative", () => ({
  loadMonthlyIdentityNarratives: loadMonthlyIdentityNarrativesMock,
}));
vi.mock("@/actions/auth", () => ({
  signOut: vi.fn(),
}));

const { MonthlyIdentityNarrativeCard } = await import(
  "@/components/timeline/monthly-identity-narrative-card"
);
const { default: TimelinePage } = await import("@/app/(protected)/timeline/page");

function makeNarrative(
  overrides: Partial<MonthlyIdentityNarrative> = {},
): MonthlyIdentityNarrative {
  return {
    month: "June 2026",
    headline: "The month you stopped waiting for permission",
    openingBeginning: "June opened with a decision you had postponed for weeks.",
    openingEnd: "By the end of the month the move felt inevitable.",
    howYouChanged: ["You became more decisive", "You became less anchored to routine"],
    previousMonth: "May 2026",
    comparison: {
      traitsMorePresent: [],
      traitsLessPresent: [],
      newlyObserved: [],
    } as MonthlyIdentityNarrative["comparison"],
    situationCount: 2,
    checkInCount: 1,
    reflectionCount: 1,
    ...overrides,
  };
}

function renderCard(narrative: MonthlyIdentityNarrative): string {
  return renderToStaticMarkup(createElement(MonthlyIdentityNarrativeCard, { narrative }));
}

async function renderTimelinePage(): Promise<string> {
  return renderToStaticMarkup(await TimelinePage());
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserIdentityMock.mockResolvedValue({ displayName: "Sam", initial: "S" });
  getUnansweredReflectionSummaryMock.mockResolvedValue({
    unansweredCount: 0,
    pending: null,
  });
  loadMonthlyIdentityNarrativesMock.mockResolvedValue({
    narratives: [makeNarrative()],
  });
});

// ---------------------------------------------------------------------------
// MonthlyIdentityNarrativeCard — narrative content
// ---------------------------------------------------------------------------

describe("MonthlyIdentityNarrativeCard — narrative content", () => {
  it("renders the headline", () => {
    expect(renderCard(makeNarrative())).toContain(
      "The month you stopped waiting for permission",
    );
  });

  it("shows the first opening paragraph as the preview and keeps the rest behind a disclosure", () => {
    const html = renderCard(makeNarrative());

    expect(html).toContain("June opened with a decision you had postponed for weeks.");
    // The second paragraph reads on demand: not in the initial render, but
    // reachable through the collapsed disclosure toggle.
    expect(html).not.toContain("By the end of the month the move felt inevitable.");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Read full chapter");
  });

  it("uses the closing paragraph as the preview when the opening one is missing", () => {
    const html = renderCard(makeNarrative({ openingBeginning: "" }));

    expect(html).toContain("By the end of the month the move felt inevitable.");
    expect(html).not.toContain("Read full chapter");
  });

  it("renders no preview or disclosure when both opening paragraphs are missing", () => {
    const html = renderCard(makeNarrative({ openingBeginning: "", openingEnd: "" }));

    expect(html).not.toContain("June opened with");
    expect(html).not.toContain("Read full chapter");
  });
});

// ---------------------------------------------------------------------------
// MonthlyIdentityNarrativeCard — how you changed
// ---------------------------------------------------------------------------

describe("MonthlyIdentityNarrativeCard — how you changed", () => {
  it("renders one row per change statement", () => {
    const html = renderCard(makeNarrative());

    expect(html).toContain("How You Changed");
    expect(html).toContain("You became more decisive");
    expect(html).toContain("You became less anchored to routine");
  });

  it("marks 'became more' statements as up and 'became less' statements as down", () => {
    const html = renderCard(
      makeNarrative({ howYouChanged: ["You became more decisive"] }),
    );
    expect(html).toContain("↑");
    expect(html).not.toContain("↓");

    const downHtml = renderCard(
      makeNarrative({ howYouChanged: ["You became less anchored to routine"] }),
    );
    expect(downHtml).toContain("↓");
    expect(downHtml).not.toContain("↑");
  });

  it("omits the section entirely when there are no change statements", () => {
    const html = renderCard(makeNarrative({ howYouChanged: [] }));

    expect(html).not.toContain("How You Changed");
  });
});

// ---------------------------------------------------------------------------
// MonthlyIdentityNarrativeCard — evidence
// ---------------------------------------------------------------------------

describe("MonthlyIdentityNarrativeCard — evidence", () => {
  it("renders the evidence counts with pluralized labels", () => {
    const html = renderCard(makeNarrative());

    expect(html).toContain("Evidence");
    expect(html).toContain("situations");
    expect(html).toContain("check-in");
    expect(html).toContain("reflection");
  });

  it("uses singular labels for counts of one and plural otherwise", () => {
    const html = renderCard(
      makeNarrative({ situationCount: 1, checkInCount: 3, reflectionCount: 0 }),
    );

    expect(html).toContain(">situation<");
    expect(html).toContain(">check-ins<");
    expect(html).toContain(">reflections<");
  });
});

// ---------------------------------------------------------------------------
// MonthlyIdentityNarrativeCard — section order
// ---------------------------------------------------------------------------

describe("MonthlyIdentityNarrativeCard — section order", () => {
  it("renders headline, opening preview, how you changed, then evidence", () => {
    const html = renderCard(makeNarrative());

    const headlineIndex = html.indexOf("The month you stopped waiting for permission");
    const previewIndex = html.indexOf("June opened with a decision");
    const changedIndex = html.indexOf("How You Changed");
    const evidenceIndex = html.indexOf("Evidence");

    expect(headlineIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeGreaterThan(headlineIndex);
    expect(changedIndex).toBeGreaterThan(previewIndex);
    expect(evidenceIndex).toBeGreaterThan(changedIndex);
  });
});

// ---------------------------------------------------------------------------
// Timeline page — renders monthly narratives
// ---------------------------------------------------------------------------

describe("Timeline page — renders monthly narratives", () => {
  it("renders each narrative as a dated chapter: month label plus card content", async () => {
    loadMonthlyIdentityNarrativesMock.mockResolvedValue({
      narratives: [
        makeNarrative(),
        makeNarrative({ month: "May 2026", headline: "A slower month of groundwork" }),
      ],
    });

    const html = await renderTimelinePage();

    expect(html).toContain("June 2026");
    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).toContain("May 2026");
    expect(html).toContain("A slower month of groundwork");
  });

  it("shows an empty state when there are no monthly narratives", async () => {
    loadMonthlyIdentityNarrativesMock.mockResolvedValue({ narratives: [] });

    const html = await renderTimelinePage();

    expect(html).toContain("No monthly chapters yet.");
  });

  it("surfaces a load error instead of silently rendering nothing", async () => {
    loadMonthlyIdentityNarrativesMock.mockResolvedValue({
      error: "Could not load your timeline.",
    });

    const html = await renderTimelinePage();

    expect(html).toContain("Could not load your timeline.");
    expect(html).not.toContain("No monthly chapters yet.");
  });
});
