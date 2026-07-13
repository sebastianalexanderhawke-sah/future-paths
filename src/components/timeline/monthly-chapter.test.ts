import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";
import type { ChapterStory, ChapterStoryline } from "@/lib/timeline-chapter-story";

// Behavioral tests: render the chapter preview, the full chapter, and the
// Timeline page with fixture narratives/stories and assert on the visible
// output — the collapsed preview, the truthful "The Person You Were
// Becoming" comparison, the compact "What Changed" rows, and the accordion —
// instead of on component source.

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
    teaser: "The waiting had a shape by now, and this was the month it cracked.",
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

/**
 * A narrative stored before the dedicated teaser existed: the cover borrows
 * the opening's first sentence, and the chapter keeps the deterministic
 * movement bullets instead of the portraits.
 */
function makeLegacyNarrative(
  overrides: Partial<MonthlyIdentityNarrative> = {},
): MonthlyIdentityNarrative {
  return makeNarrative({ teaser: "", ...overrides });
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
): string {
  return renderToStaticMarkup(createElement(MonthlyChapter, { narrative, story }));
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
  it("reads like a cover: only month, headline, one teaser sentence, story count", () => {
    const html = renderPreview(makeNarrative());

    expect(html).toContain("June 2026");
    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).toContain(
      "The waiting had a shape by now, and this was the month it cracked.",
    );
    expect(html).toContain("1 story changed this month.");
    // The portraits wait inside the chapter; the cover never borrows them.
    expect(html).not.toContain("June opened with a decision");
    expect(html).not.toContain("The postponing had become its own routine.");
    expect(html).not.toContain("By the end of the month the move felt inevitable.");
    // No identity preview, dominant theme, or shift values on the cover.
    expect(html).not.toContain("Identity Preview");
    expect(html).not.toContain("Courage");
    expect(html).not.toContain("+8");
    expect(html).not.toContain("−4");
  });

  it("shows no teaser on legacy narratives instead of borrowing the portrait", () => {
    const html = renderPreview(makeLegacyNarrative());

    expect(html).toContain("The month you stopped waiting for permission");
    // The portraits render inside the chapter now, so the cover never
    // borrows their first sentence.
    expect(html).not.toContain("June opened with a decision");
    expect(html).not.toContain("this was the month it cracked");
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

    expect(html).not.toContain("What Changed");
    expect(html).not.toContain("The Person You Were Becoming");
    expect(html).not.toContain("Beginning of June");
    expect(html).not.toContain("Just an idea.");
  });

  it("omits the story count when the month has no story", () => {
    const html = renderPreview(makeNarrative(), null);

    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).not.toContain("changed this month");
  });
});

// ---------------------------------------------------------------------------
// Chapter — becoming portraits (new-format narratives)
// ---------------------------------------------------------------------------

describe("chapter — becoming portraits", () => {
  it("renders the full identity portraits as a Beginning → End comparison", () => {
    const html = renderChapter(makeNarrative());

    expect(html).toContain("The Person You Were Becoming");
    expect(html).toContain("Beginning of June");
    expect(html).toContain("The postponing had become its own routine.");
    expect(html).toContain("End of June");
    expect(html).toContain("By the end of the month the move felt inevitable.");
  });

  it("renders no derived movement bullets anywhere", () => {
    const html = renderChapter(makeNarrative());

    expect(html).not.toContain("More willing to act without certainty.");
    expect(html).not.toContain("More isolated.");
    expect(html).not.toContain("You became more decisive.");
    expect(html).not.toContain("<ul");
  });

  it("never repeats the cover teaser inside the portraits", () => {
    const html = renderChapter(makeNarrative());

    const teaserMatches =
      html.match(/The waiting had a shape by now, and this was the month it cracked\./g) ??
      [];
    expect(teaserMatches.length).toBe(1);
  });

  it("still renders the portraits when the month has no derived story", () => {
    const html = renderChapter(makeNarrative(), null);

    expect(html).toContain("The Person You Were Becoming");
    expect(html).toContain("The postponing had become its own routine.");
    expect(html).toContain("By the end of the month the move felt inevitable.");
  });

  it("renders legacy narratives' stored portraits too, never bullets", () => {
    const html = renderChapter(makeLegacyNarrative());

    expect(html).toContain("The Person You Were Becoming");
    expect(html).toContain("Beginning of June");
    expect(html).toContain("The postponing had become its own routine.");
    expect(html).toContain("End of June");
    expect(html).toContain("By the end of the month the move felt inevitable.");
    // The deterministic movement phrases and placeholder copy are gone.
    expect(html).not.toContain("More willing to act without certainty.");
    expect(html).not.toContain("where May left you");
    expect(html).not.toContain("How You Left June");
    expect(html).not.toContain("recorded journey");
    expect(html).not.toContain("foundation of your Current Self");
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

  it("falls back to the Timeline's emerald family when a month has no shifts", () => {
    const html = renderPreview(
      makeNarrative(),
      makeStory({ identityShifts: [], closingReflection: null }),
    );

    expect(html).toContain("#065f46");
  });
});

// ---------------------------------------------------------------------------
// Chapter — the in-progress month speaks in the present tense
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
}

// React escapes the apostrophe in static markup.
const BECOMING_LABEL = "Who You&#x27;re Becoming";

describe("chapter — current month is still emerging", () => {
  const month = currentMonthLabel();
  const monthName = month.split(" ")[0];

  it("labels the portrait end as who you're becoming, never as an ending", () => {
    const html = renderChapter(makeNarrative({ month }));

    expect(html).toContain(`Beginning of ${monthName}`);
    expect(html).toContain(BECOMING_LABEL);
    expect(html).not.toContain(`End of ${monthName}`);
    expect(html).not.toContain(`How You Left ${monthName}`);
  });

  it("keeps present-tense language on legacy narratives' portraits too", () => {
    const html = renderChapter(makeLegacyNarrative({ month }), makeStory({ month }));

    expect(html).toContain(BECOMING_LABEL);
    expect(html).not.toContain(`End of ${monthName}`);
    expect(html).not.toContain(`How You Left ${monthName}`);
  });

  it("still describes completed months as who you became by their end", () => {
    const html = renderChapter(makeNarrative(), makeStory());

    expect(html).toContain("End of June");
    expect(html).not.toContain(BECOMING_LABEL);
  });
});

// ---------------------------------------------------------------------------
// Chapter — the person you were becoming
// ---------------------------------------------------------------------------

describe("chapter — the person you were becoming", () => {
  it("speaks in identity language, never in report-style magnitude rows", () => {
    const html = renderChapter(makeNarrative());

    expect(html).toContain("The Person You Were Becoming");
    expect(html).not.toContain("Identity Shifts");
    expect(html).not.toContain("+8");
    expect(html).not.toContain("−4");
  });

  it("omits the section entirely when the narrative has no portraits yet", () => {
    const html = renderChapter(
      makeLegacyNarrative({ openingBeginning: "", openingEnd: "" }),
      makeStory(),
    );

    expect(html).not.toContain("The Person You Were Becoming");
    // Never a bullet fallback: the section is portraits or nothing.
    expect(html).not.toContain("You became more decisive.");
    expect(html).not.toContain("More willing to act without certainty.");
  });
});

// ---------------------------------------------------------------------------
// Chapter — what changed: compact comparisons and disclosure
// ---------------------------------------------------------------------------

describe("chapter — what changed", () => {
  it("shows the top three situations as compact comparisons, rest folded", () => {
    const storylines = ["Building the app", "Soccer", "Relationships", "Moving", "Health"].map(
      (title, i) => makeStoryline({ momentId: `m${i}`, title }),
    );
    const html = renderChapter(makeNarrative(), makeStory({ storylines }));

    expect(html).toContain("What Changed");
    expect(html).toContain("Building the app");
    expect(html).toContain("Soccer");
    expect(html).toContain("Relationships");
    expect(html).not.toContain("Moving");
    expect(html).not.toContain("Health");
    expect(html).toContain("Show 2 more");
  });

  it("shows every situation with no disclosure when three or fewer changed", () => {
    const storylines = ["Building the app", "Soccer", "Relationships"].map((title, i) =>
      makeStoryline({ momentId: `m${i}`, title }),
    );
    const html = renderChapter(makeNarrative(), makeStory({ storylines }));

    expect(html).toContain("Building the app");
    expect(html).toContain("Soccer");
    expect(html).toContain("Relationships");
    expect(html).not.toContain("Show ");
  });

  it("uses the singular label when exactly one situation is folded", () => {
    const storylines = ["Building the app", "Soccer", "Relationships", "Moving"].map(
      (title, i) => makeStoryline({ momentId: `m${i}`, title }),
    );
    const html = renderChapter(makeNarrative(), makeStory({ storylines }));

    expect(html).toContain("Show 1 more");
  });

  it("tells each situation as a beginning → end comparison", () => {
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

    expect(html).not.toContain("What Changed");
  });
});

// ---------------------------------------------------------------------------
// Chapter — nested surfaces, closing, order
// ---------------------------------------------------------------------------

describe("chapter — surfaces and closing", () => {
  it("renders each story section on its own nested surface, cover on none", () => {
    const html = renderChapter(makeNarrative());

    // The Person You Were Becoming + What Changed + closing reflection =
    // three nested section surfaces; the cover renders directly on the
    // month's outer card, exactly as it does collapsed.
    expect((html.match(/data-surface="chapter-section"/g) ?? []).length).toBe(3);
  });

  it("keeps the cover as the header without reprinting it in the opened chapter", () => {
    const html = renderChapter(makeNarrative(), makeStory());

    // The cover appears exactly once — title, month, and teaser — and the
    // portraits below it never borrow a cover line.
    const titleMatches =
      html.match(/The month you stopped waiting for permission/g) ?? [];
    expect(titleMatches.length).toBe(1);
    expect((html.match(/June 2026/g) ?? []).length).toBe(1);
    const teaserMatches = html.match(/this was the month it cracked\./g) ?? [];
    expect(teaserMatches.length).toBe(1);
  });

  it("ends the chapter with the open closing line", () => {
    const html = renderChapter(makeNarrative());

    expect(html).toContain(
      "You carried more courage and less stability out of June than you brought in",
    );
  });

  it("keeps serif type for the chapter title and section headings only", () => {
    const html = renderChapter(makeNarrative());

    // Cover headline + "The Person You Were Becoming" + "What Changed".
    // Body copy — portraits, comparisons, closing — is the app's standard
    // sans text, never italic.
    expect((html.match(/font-voice/g) ?? []).length).toBe(3);
    expect(html).not.toContain("italic");
  });

  it("reads title → teaser → who I was becoming → what changed → what to remember", () => {
    const html = renderChapter(makeNarrative(), makeStory());

    const title = html.indexOf("The month you stopped waiting for permission");
    const teaser = html.indexOf("this was the month it cracked.");
    const becoming = html.indexOf("The Person You Were Becoming");
    const beginning = html.indexOf("Beginning of June");
    const beginningPortrait = html.indexOf("June opened with a decision");
    const end = html.indexOf("End of June");
    const endPortrait = html.indexOf("the move felt inevitable.");
    const changed = html.indexOf("What Changed");
    const story = html.indexOf("Just an idea.");
    const closing = html.indexOf("out of June than you brought in");

    expect(title).toBeGreaterThan(-1);
    expect(teaser).toBeGreaterThan(title);
    expect(becoming).toBeGreaterThan(teaser);
    expect(beginning).toBeGreaterThan(becoming);
    expect(beginningPortrait).toBeGreaterThan(beginning);
    expect(end).toBeGreaterThan(beginningPortrait);
    expect(endPortrait).toBeGreaterThan(end);
    expect(changed).toBeGreaterThan(endPortrait);
    expect(story).toBeGreaterThan(changed);
    expect(closing).toBeGreaterThan(story);
  });

  it("degrades to the narrative-only chapter when no story exists for the month", () => {
    const legacy = renderChapter(makeLegacyNarrative(), null);

    expect(legacy).toContain("The month you stopped waiting for permission");
    // The portraits still tell the identity story; only the story-derived
    // sections (situations, closing) drop away.
    expect(legacy).toContain("The postponing had become its own routine.");
    expect(legacy).not.toContain("You became more decisive.");
    expect(legacy).not.toContain("What Changed");
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
    expect(html).toContain("1 story changed this month.");
    expect(html).not.toContain("Identity Preview");
    expect(html).toContain("Show chapter");
    expect(html).toContain('aria-expanded="false"');
    // Collapsed by default: the full sections stay behind the disclosure.
    expect(html).not.toContain("What Changed");
    expect(html).not.toContain("The Person You Were Becoming");
    expect(html).not.toContain("End of June");
  });

  it("still renders chapter previews when the story load fails", async () => {
    loadTimelineChapterStoriesMock.mockResolvedValue({ error: "boom" });

    const html = await renderTimelinePage();

    expect(html).toContain("The month you stopped waiting for permission");
    expect(html).toContain("Show chapter");
    expect(html).not.toContain("changed this month");
  });

  it("shows an empty state when there are no monthly narratives", async () => {
    loadMonthlyIdentityNarrativesMock.mockResolvedValue({ narratives: [] });

    const html = await renderTimelinePage();

    expect(html).toContain("Your first chapter is still being written.");
  });

  it("surfaces a load error instead of silently rendering nothing", async () => {
    loadMonthlyIdentityNarrativesMock.mockResolvedValue({
      error: "Could not load your timeline.",
    });

    const html = await renderTimelinePage();

    expect(html).toContain("Could not load your timeline.");
    expect(html).not.toContain("Your first chapter is still being written.");
  });
});
