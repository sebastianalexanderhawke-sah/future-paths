import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";
import type { ChapterStory, ChapterStoryline } from "@/lib/timeline-chapter-story";

// Behavioral tests: render the chapter preview, the full chapter, and the
// Timeline page with fixture narratives/stories and assert on the visible
// output — the collapsed preview, the truthful Beginning → End, shift rows,
// the featured situation, and the accordion — instead of on component source.

const {
  getUserIdentityMock,
  getUnansweredReflectionSummaryMock,
  loadMonthlyIdentityNarrativesMock,
  loadTimelineChapterStoriesMock,
} = vi.hoisted(() => ({
  getUserIdentityMock: vi.fn(),
  getUnansweredReflectionSummaryMock: vi.fn(),
  loadMonthlyIdentityNarrativesMock: vi.fn(),
  loadTimelineChapterStoriesMock: vi.fn(),
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
vi.mock("@/lib/timeline-chapter-story-loader", () => ({
  loadTimelineChapterStories: loadTimelineChapterStoriesMock,
}));
vi.mock("@/actions/auth", () => ({
  signOut: vi.fn(),
}));

const { MonthlyChapter, MonthlyChapterPreview } = await import(
  "@/components/timeline/monthly-chapter"
);
const { default: TimelinePage } = await import("@/app/(protected)/timeline/page");

function makeNarrative(
  overrides: Partial<MonthlyIdentityNarrative> = {},
): MonthlyIdentityNarrative {
  return {
    month: "June 2026",
    headline: "The month you stopped waiting for permission",
    openingBeginning:
      "June opened with a decision you had postponed for weeks. The postponing had become its own routine.",
    openingEnd: "By the end of the month the move felt inevitable.",
    howYouChanged: ["You became more decisive.", "You became less anchored to routine."],
    previousMonth: "May 2026",
    comparison: {
      traitsMorePresent: [],
      traitsLessPresent: [],
    },
    situationCount: 2,
    checkInCount: 1,
    reflectionCount: 1,
    ...overrides,
  };
}

function makeStoryline(overrides: Partial<ChapterStoryline> = {}): ChapterStoryline {
  return {
    momentId: "m1",
    title: "Building the app",
    beginning: "Just an idea.",
    end: ["20 active users.", "Receiving feedback from real people."],
    weight: 3,
    ...overrides,
  };
}

function makeStory(overrides: Partial<ChapterStory> = {}): ChapterStory {
  return {
    month: "June 2026",
    identityShifts: [
      { theme: "Courage", value: 8 },
      { theme: "Loneliness", value: 7 },
      { theme: "Stability", value: -4 },
    ],
    storylines: [makeStoryline()],
    closingReflection:
      "You carried more courage and less stability out of June than you brought in — most of that change was written in Building the app.",
    ...overrides,
  };
}

function makePreviousStory(overrides: Partial<ChapterStory> = {}): ChapterStory {
  return makeStory({
    month: "May 2026",
    identityShifts: [{ theme: "Connection", value: -2 }],
    storylines: [],
    closingReflection: null,
    ...overrides,
  });
}

function renderChapter(
  narrative: MonthlyIdentityNarrative,
  story: ChapterStory | null = makeStory(),
  previousStory: ChapterStory | null = null,
): string {
  return renderToStaticMarkup(
    createElement(MonthlyChapter, { narrative, story, previousStory }),
  );
}

function renderPreview(
  narrative: MonthlyIdentityNarrative,
  story: ChapterStory | null = makeStory(),
): string {
  return renderToStaticMarkup(
    createElement(MonthlyChapterPreview, { narrative, story }),
  );
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
  loadTimelineChapterStoriesMock.mockResolvedValue({
    storiesByMonth: new Map([
      ["June 2026", makeStory()],
      ["May 2026", makePreviousStory()],
    ]),
  });
});

// ---------------------------------------------------------------------------
// Chapter preview — the collapsed card
// ---------------------------------------------------------------------------

describe("chapter preview — collapsed card", () => {
  it("reads like a cover: month, headline, one epigraph sentence, identity preview", () => {
    const html = renderPreview(makeNarrative());

    expect(html).toContain("June 2026");
    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).toContain("June opened with a decision you had postponed for weeks.");
    // Only the first sentence previews; the rest waits inside the chapter.
    expect(html).not.toContain("The postponing had become its own routine.");
    expect(html).not.toContain("By the end of the month the move felt inevitable.");

    expect(html).toContain("Identity Preview");
    expect(html).toContain("Courage");
    expect(html).toContain("+8");
    expect(html).toContain("Loneliness");
    expect(html).toContain("+7");
    expect(html).toContain("Stability");
    expect(html).toContain("−4");
  });

  it("says how many stories the chapter holds", () => {
    const one = renderPreview(makeNarrative());
    expect(one).toContain("1 story changed this month.");

    const storylines = ["A", "B", "C"].map((title, i) =>
      makeStoryline({ momentId: `m${i}`, title }),
    );
    const three = renderPreview(makeNarrative(), makeStory({ storylines }));
    expect(three).toContain("3 stories changed this month.");
  });

  it("keeps the full chapter sections out of the preview", () => {
    const html = renderPreview(makeNarrative());

    expect(html).not.toContain("Your Life Changed");
    expect(html).not.toContain("Identity Shifts");
    expect(html).not.toContain("Beginning of June");
    expect(html).not.toContain("Just an idea.");
  });

  it("omits the identity preview and story count when the month has no story", () => {
    const html = renderPreview(makeNarrative(), null);

    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).not.toContain("Identity Preview");
    expect(html).not.toContain("changed this month");
  });
});

// ---------------------------------------------------------------------------
// Chapter — truthful beginning vs end
// ---------------------------------------------------------------------------

describe("chapter — truthful beginning vs end", () => {
  it("describes the month's movement comparatively, from recorded shifts", () => {
    const html = renderChapter(makeNarrative());

    expect(html).toContain("More willing to act without certainty.");
    expect(html).toContain("More isolated.");
    expect(html).toContain("Placing less weight on stability.");
  });

  it("shows a beginning only when the previous month recorded one, with provenance", () => {
    const withPrior = renderChapter(makeNarrative(), makeStory(), makePreviousStory());

    expect(withPrior).toContain("Beginning of June");
    expect(withPrior).toContain("where May left you");
    expect(withPrior).toContain("Investing less in the people around you.");
    expect(withPrior).toContain("End of June");
    expect(withPrior).not.toContain("How You Left June");
    expect(withPrior).not.toContain("recorded journey");
  });

  it("keeps the first month's two-block shape but honestly explains the missing beginning", () => {
    const withoutPrior = renderChapter(makeNarrative(), makeStory(), null);

    expect(withoutPrior).toContain("Beginning of June");
    expect(withoutPrior).toContain("The beginning of your recorded journey.");
    expect(withoutPrior).toContain(
      "describe who you were before this month",
    );
    expect(withoutPrior).toContain("How You Left June");
    expect(withoutPrior).toContain("More willing to act without certainty.");
    // No fabricated identity bullets, and no bare "End of X" without a beginning.
    expect(withoutPrior).not.toContain("End of June");
    expect(withoutPrior).not.toContain("where May left you");
  });

  it("never invents a balanced opening for a rising difficult theme", () => {
    const html = renderChapter(makeNarrative(), makeStory(), null);

    expect(html).not.toContain("socially connected");
    expect(html).not.toContain("Invested in the people around you.");
  });

  it("falls back to the month comparison when a month has no magnitudes", () => {
    const html = renderChapter(
      makeNarrative({
        comparison: { traitsMorePresent: ["Courage"], traitsLessPresent: [] },
      }),
      makeStory({ identityShifts: [], closingReflection: null }),
    );

    expect(html).toContain("Beginning of June");
    expect(html).toContain("The beginning of your recorded journey.");
    expect(html).toContain("How You Left June");
    expect(html).toContain("More willing to act without certainty.");
  });

  it("omits the comparison when there is no identity evidence at all", () => {
    const html = renderChapter(
      makeNarrative(),
      makeStory({ identityShifts: [], closingReflection: null }),
    );

    expect(html).not.toContain("Beginning of June");
    expect(html).not.toContain("End of June");
    expect(html).not.toContain("How You Left June");
  });
});

// ---------------------------------------------------------------------------
// Chapter — accent identity
// ---------------------------------------------------------------------------

describe("chapter — accent identity", () => {
  it("colors the chapter title with the strongest shift's family", () => {
    // Fixture's strongest shift is Courage → emerald family.
    const preview = renderPreview(makeNarrative());
    expect(preview).toContain("#065f46");

    const chapter = renderChapter(makeNarrative());
    expect(chapter).toContain("#065f46");
  });

  it("gives a difficult month its own quiet identity, not a warning color", () => {
    const slateStory = makeStory({
      identityShifts: [{ theme: "Loneliness", value: 5 }],
      closingReflection: null,
    });
    const html = renderPreview(makeNarrative(), slateStory);

    // Slate title, no red anywhere.
    expect(html).toContain("#1e293b");
    expect(html).not.toContain("#dc2626");
  });

  it("marks each shift row with its own theme-family dot", () => {
    const html = renderChapter(makeNarrative());

    // Courage → emerald dot, Loneliness → slate dot, Stability → amber
    // (falling, so its bar uses the pale amber fill).
    expect(html).toContain("#10b981");
    expect(html).toContain("#64748b");
    expect(html).toContain("#fde68a");
  });

  it("falls back to the Timeline's emerald family when a month has no shifts", () => {
    const html = renderPreview(
      makeNarrative(),
      makeStory({ identityShifts: [], closingReflection: null }),
    );

    expect(html).toContain("#065f46");
  });
});

// ---------------------------------------------------------------------------
// Chapter — identity shifts
// ---------------------------------------------------------------------------

describe("chapter — identity shifts", () => {
  it("renders one row per shift with signed magnitudes, unsplit by direction", () => {
    const html = renderChapter(makeNarrative());

    expect(html).toContain("Identity Shifts");
    expect(html).toContain("+8");
    expect(html).toContain("+7");
    expect(html).toContain("−4");
    expect(html).not.toContain("Growing");
    expect(html).not.toContain("Fading");
  });

  it("falls back to the deterministic movement statements when a month has no magnitudes", () => {
    const html = renderChapter(
      makeNarrative(),
      makeStory({ identityShifts: [], closingReflection: null }),
    );

    expect(html).toContain("Identity Shifts");
    expect(html).toContain("You became more decisive.");
  });

  it("omits the section when there are neither magnitudes nor statements", () => {
    const html = renderChapter(
      makeNarrative({ howYouChanged: [] }),
      makeStory({ identityShifts: [], closingReflection: null }),
    );

    expect(html).not.toContain("Identity Shifts");
  });
});

// ---------------------------------------------------------------------------
// Chapter — featured situation and stories disclosure
// ---------------------------------------------------------------------------

describe("chapter — your life changed", () => {
  it("features only the situation that changed the most", () => {
    const storylines = ["Building the app", "Soccer", "Relationships"].map((title, i) =>
      makeStoryline({ momentId: `m${i}`, title }),
    );
    const html = renderChapter(makeNarrative(), makeStory({ storylines }));

    expect(html).toContain("Your Life Changed");
    expect(html).toContain("Building the app");
    expect(html).not.toContain("Soccer");
    expect(html).not.toContain("Relationships");
    expect(html).toContain("Show 2 more stories");
  });

  it("uses the singular label when exactly one situation is folded", () => {
    const storylines = ["Building the app", "Soccer"].map((title, i) =>
      makeStoryline({ momentId: `m${i}`, title }),
    );
    const html = renderChapter(makeNarrative(), makeStory({ storylines }));

    expect(html).toContain("Show 1 more story");
  });

  it("tells the featured situation as a beginning → end story", () => {
    const html = renderChapter(makeNarrative());

    expect(html).toContain("Just an idea.");
    expect(html).toContain("20 active users.");
  });

  it("does not render raw evidence counts anywhere", () => {
    const html = renderChapter(makeNarrative());

    expect(html).not.toContain("Evidence");
    expect(html).not.toContain("situations");
    expect(html).not.toContain("check-in");
    expect(html).not.toContain("reflections");
  });

  it("omits the section when the month has no storylines", () => {
    const html = renderChapter(makeNarrative(), makeStory({ storylines: [] }));

    expect(html).not.toContain("Your Life Changed");
  });
});

// ---------------------------------------------------------------------------
// Chapter — nested surfaces, closing, order
// ---------------------------------------------------------------------------

describe("chapter — surfaces and closing", () => {
  it("renders each section on its own nested surface", () => {
    const html = renderChapter(makeNarrative());

    // Hero (month/title/intro) + Beginning → End + Identity Shifts +
    // featured situation + closing reflection = five nested section
    // surfaces inside the month's outer card.
    expect((html.match(/data-surface="chapter-section"/g) ?? []).length).toBe(5);
  });

  it("ends the chapter with the open closing line", () => {
    const html = renderChapter(makeNarrative());

    expect(html).toContain(
      "You carried more courage and less stability out of June than you brought in",
    );
  });

  it("reads who I was → who I became → what changed → what happened → what to remember", () => {
    const html = renderChapter(makeNarrative(), makeStory(), makePreviousStory());

    const title = html.indexOf("The month you stopped waiting for permission");
    const intro = html.indexOf("June opened with a decision");
    const beginning = html.indexOf("Beginning of June");
    const end = html.indexOf("End of June");
    const shifts = html.indexOf("Identity Shifts");
    const life = html.indexOf("Your Life Changed");
    const closing = html.indexOf("out of June than you brought in");

    expect(title).toBeGreaterThan(-1);
    expect(intro).toBeGreaterThan(title);
    expect(beginning).toBeGreaterThan(intro);
    expect(end).toBeGreaterThan(beginning);
    expect(shifts).toBeGreaterThan(end);
    expect(life).toBeGreaterThan(shifts);
    expect(closing).toBeGreaterThan(life);
  });

  it("degrades to the narrative-only chapter when no story exists for the month", () => {
    const html = renderChapter(makeNarrative(), null, null);

    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).toContain("You became more decisive.");
    expect(html).not.toContain("Your Life Changed");
  });
});

// ---------------------------------------------------------------------------
// Timeline page — chapter browsing
// ---------------------------------------------------------------------------

describe("Timeline page — chapter browsing", () => {
  it("renders every month as a collapsed chapter card with a Show chapter control", async () => {
    loadMonthlyIdentityNarrativesMock.mockResolvedValue({
      narratives: [
        makeNarrative(),
        makeNarrative({
          month: "May 2026",
          headline: "A slower month of groundwork",
          previousMonth: null,
        }),
      ],
    });

    const html = await renderTimelinePage();

    expect(html).toContain("June 2026");
    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).toContain("May 2026");
    expect(html).toContain("A slower month of groundwork");
    expect(html).toContain("Identity Preview");
    expect(html).toContain("Show chapter");
    expect(html).toContain('aria-expanded="false"');
    // Collapsed by default: the full sections stay behind the disclosure.
    expect(html).not.toContain("Your Life Changed");
    expect(html).not.toContain("Identity Shifts");
    expect(html).not.toContain("End of June");
  });

  it("still renders chapter previews when the story load fails", async () => {
    loadTimelineChapterStoriesMock.mockResolvedValue({ error: "boom" });

    const html = await renderTimelinePage();

    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).toContain("Show chapter");
    expect(html).not.toContain("Identity Preview");
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
