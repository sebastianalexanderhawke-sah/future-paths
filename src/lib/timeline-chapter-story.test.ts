import { describe, expect, it } from "vitest";

import {
  buildChapterStories,
  buildStoryline,
  composeClosingReflection,
  computeIdentityShifts,
  isMonthInProgress,
  splitIntoSentences,
  type ChapterCheckInInput,
  type ChapterChosenPathInput,
  type ChapterMomentInput,
} from "@/lib/timeline-chapter-story";
import type { ThemeChange } from "@/types/database";

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

function makeMoment(overrides: Partial<ChapterMomentInput> = {}): ChapterMomentInput {
  return {
    id: "m1",
    title: "Reflection",
    description: "Just an idea for an app that helps people reflect.",
    currentUnderstanding: "A side project with early traction.",
    createdAt: "2026-07-02T10:00:00Z",
    ...overrides,
  };
}

function makeCheckIn(overrides: Partial<ChapterCheckInInput> = {}): ChapterCheckInInput {
  return {
    momentId: "m1",
    realitySummary: "20 active users. Feedback is arriving weekly.",
    identityImpact: "Receiving feedback from real people changed how you build.",
    themeChanges: [],
    createdAt: "2026-07-20T10:00:00Z",
    ...overrides,
  };
}

function makePath(overrides: Partial<ChapterChosenPathInput> = {}): ChapterChosenPathInput {
  return {
    momentId: "m1",
    title: "Ship the prototype to strangers",
    chosenAt: "2026-07-10T10:00:00Z",
    ...overrides,
  };
}

const up = (theme: string): ThemeChange =>
  ({ theme, direction: "strengthened" }) as ThemeChange;
const down = (theme: string): ThemeChange =>
  ({ theme, direction: "weakened" }) as ThemeChange;
const present = (theme: string): ThemeChange =>
  ({ theme, direction: "present" }) as ThemeChange;
const fading = (theme: string): ThemeChange =>
  ({ theme, direction: "fading" }) as ThemeChange;

// ---------------------------------------------------------------------------
// splitIntoSentences
// ---------------------------------------------------------------------------

describe("splitIntoSentences", () => {
  it("splits multi-sentence prose keeping terminal punctuation", () => {
    expect(
      splitIntoSentences("You waited for certainty. You believed soccer was the only future."),
    ).toEqual([
      "You waited for certainty.",
      "You believed soccer was the only future.",
    ]);
  });

  it("keeps a trailing unpunctuated fragment as its own sentence", () => {
    expect(splitIntoSentences("First done. then a fragment")).toEqual([
      "First done.",
      "then a fragment",
    ]);
  });

  it("returns an empty list for empty or whitespace input", () => {
    expect(splitIntoSentences("")).toEqual([]);
    expect(splitIntoSentences("   ")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeIdentityShifts
// ---------------------------------------------------------------------------

describe("computeIdentityShifts", () => {
  it("nets movement per theme across check-ins with signed values", () => {
    const shifts = computeIdentityShifts([
      [up("Courage"), down("Stability")],
      [up("Courage"), present("Loneliness")],
      [up("Courage")],
    ]);

    expect(shifts).toEqual([
      { theme: "Courage", value: 3 },
      { theme: "Stability", value: -1 },
      { theme: "Loneliness", value: 1 },
    ]);
  });

  it("treats difficult themes symmetrically: present adds, fading subtracts", () => {
    const shifts = computeIdentityShifts([
      [present("Loneliness"), present("Loneliness")],
      [fading("Uncertainty")],
    ]);

    expect(shifts).toContainEqual({ theme: "Loneliness", value: 2 });
    expect(shifts).toContainEqual({ theme: "Uncertainty", value: -1 });
  });

  it("sorts by absolute magnitude, not by direction", () => {
    const shifts = computeIdentityShifts([
      [down("Stability"), down("Stability"), up("Courage")],
      [down("Stability"), up("Courage")],
      [down("Stability")],
    ]);

    // Stability −4 outranks Courage +2 despite being a decline.
    expect(shifts.map((s) => s.theme)).toEqual(["Stability", "Courage"]);
    expect(shifts[0].value).toBe(-4);
  });

  it("drops themes whose movement nets to zero and caps the list at 5", () => {
    const shifts = computeIdentityShifts([
      [up("Growth"), down("Growth")],
      [
        up("Courage"),
        up("Connection"),
        up("Curiosity"),
        up("Belonging"),
        up("Leadership"),
        up("Creativity"),
      ],
    ]);

    expect(shifts.find((s) => s.theme === "Growth")).toBeUndefined();
    expect(shifts).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// buildStoryline
// ---------------------------------------------------------------------------

describe("buildStoryline", () => {
  it("opens with the situation as first described when it started this month", () => {
    const storyline = buildStoryline("2026-07", makeMoment(), [makeCheckIn()], []);

    expect(storyline?.beginning).toBe("Just an idea for an app that helps people reflect.");
    expect(storyline?.end).toEqual([
      "20 active users.",
      "Receiving feedback from real people changed how you build.",
    ]);
  });

  it("opens with the month's first check-in when an older situation has several", () => {
    const older = makeMoment({ createdAt: "2026-05-01T10:00:00Z" });
    const storyline = buildStoryline(
      "2026-07",
      older,
      [
        makeCheckIn({
          realitySummary: "Still just planning.",
          createdAt: "2026-07-03T10:00:00Z",
        }),
        makeCheckIn({ createdAt: "2026-07-25T10:00:00Z" }),
      ],
      [],
    );

    expect(storyline?.beginning).toBe("Still just planning.");
    expect(storyline?.end[0]).toBe("20 active users.");
  });

  it("falls back to the standing understanding for an older situation with one check-in", () => {
    const older = makeMoment({ createdAt: "2026-05-01T10:00:00Z" });
    const storyline = buildStoryline("2026-07", older, [makeCheckIn()], []);

    expect(storyline?.beginning).toBe("A side project with early traction.");
  });

  it("ends on the chosen path when the month's only event was choosing one", () => {
    const storyline = buildStoryline("2026-07", makeMoment(), [], [makePath()]);

    expect(storyline?.end).toEqual(["You chose a path: Ship the prototype to strangers."]);
  });

  it("returns null when the month produced no end state at all", () => {
    expect(buildStoryline("2026-07", makeMoment(), [], [])).toBeNull();
  });

  it("drops a beginning identical to the end so nothing renders as a fake change", () => {
    const older = makeMoment({
      createdAt: "2026-05-01T10:00:00Z",
      currentUnderstanding: "20 active users.",
    });
    const storyline = buildStoryline(
      "2026-07",
      older,
      [makeCheckIn({ identityImpact: "" })],
      [],
    );

    expect(storyline?.beginning).toBeNull();
    expect(storyline?.end).toEqual(["20 active users."]);
  });

  it("deduplicates an identity impact that repeats the reality summary", () => {
    const storyline = buildStoryline(
      "2026-07",
      makeMoment(),
      [makeCheckIn({ identityImpact: "20 active users. And counting." })],
      [],
    );

    expect(storyline?.end).toEqual(["20 active users."]);
  });
});

// ---------------------------------------------------------------------------
// composeClosingReflection
// ---------------------------------------------------------------------------

describe("composeClosingReflection", () => {
  it("ties the two largest shifts to the leading storylines", () => {
    const closing = composeClosingReflection(
      "July 2026",
      [
        { theme: "Courage", value: 5 },
        { theme: "Stability", value: -3 },
      ],
      [
        { momentId: "m1", title: "Reflection", beginning: null, end: ["x"], weight: 3 },
        { momentId: "m2", title: "Soccer", beginning: null, end: ["y"], weight: 1 },
      ],
    );

    expect(closing).toBe(
      "You carried more courage and less stability out of July than you brought in — most of that change was written in Reflection and Soccer.",
    );
  });

  it("reads cleanly with a single shift and a single storyline", () => {
    const closing = composeClosingReflection(
      "July 2026",
      [{ theme: "Loneliness", value: 2 }],
      [{ momentId: "m1", title: "Relationships", beginning: null, end: ["x"], weight: 1 }],
    );

    expect(closing).toBe(
      "You carried more loneliness out of July than you brought in — most of that change was written in Relationships.",
    );
  });

  it("omits the storyline clause when there are no storylines", () => {
    const closing = composeClosingReflection(
      "July 2026",
      [{ theme: "Courage", value: 1 }],
      [],
    );

    expect(closing).toBe("You carried more courage out of July than you brought in.");
  });

  it("returns null when there are no identity shifts to anchor it", () => {
    expect(composeClosingReflection("July 2026", [], [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildChapterStories
// ---------------------------------------------------------------------------

describe("buildChapterStories", () => {
  it("groups evidence into one story per month keyed by the narrative month label", () => {
    const stories = buildChapterStories(
      [makeMoment()],
      [
        makeCheckIn({ themeChanges: [up("Courage")] }),
        makeCheckIn({
          createdAt: "2026-06-15T10:00:00Z",
          realitySummary: "June state.",
          identityImpact: "",
          themeChanges: [down("Stability")],
        }),
      ],
      [],
    );

    expect([...stories.keys()].sort()).toEqual(["July 2026", "June 2026"]);
    expect(stories.get("July 2026")?.identityShifts).toEqual([
      { theme: "Courage", value: 1 },
    ]);
    expect(stories.get("June 2026")?.identityShifts).toEqual([
      { theme: "Stability", value: -1 },
    ]);
  });

  it("ranks storylines by evidence weight, then recency", () => {
    const busy = makeMoment({ id: "busy", title: "Busy situation" });
    const quiet = makeMoment({ id: "quiet", title: "Quiet situation" });

    const stories = buildChapterStories(
      [busy, quiet],
      [
        makeCheckIn({ momentId: "quiet", createdAt: "2026-07-28T10:00:00Z" }),
        makeCheckIn({ momentId: "busy", createdAt: "2026-07-05T10:00:00Z" }),
        makeCheckIn({ momentId: "busy", createdAt: "2026-07-21T10:00:00Z" }),
      ],
      [makePath({ momentId: "busy" })],
    );

    const titles = stories.get("July 2026")?.storylines.map((s) => s.title);
    expect(titles).toEqual(["Busy situation", "Quiet situation"]);
  });

  it("skips evidence pointing at unknown situations instead of fabricating a storyline", () => {
    const stories = buildChapterStories(
      [],
      [makeCheckIn({ momentId: "ghost" })],
      [],
    );

    expect(stories.get("July 2026")?.storylines).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isMonthInProgress
// ---------------------------------------------------------------------------

describe("isMonthInProgress", () => {
  it("recognizes the running calendar month by its label", () => {
    const now = new Date("2026-07-12T09:00:00Z");

    expect(isMonthInProgress("July 2026", now)).toBe(true);
    expect(isMonthInProgress("June 2026", now)).toBe(false);
    expect(isMonthInProgress("July 2025", now)).toBe(false);
  });

  it("uses the UTC month, matching the rest of the chapter grouping", () => {
    // 23:30 on July 31 in UTC-2 is already August 1 locally; the chapter
    // convention stays UTC.
    const now = new Date("2026-07-31T23:30:00Z");

    expect(isMonthInProgress("July 2026", now)).toBe(true);
    expect(isMonthInProgress("August 2026", now)).toBe(false);
  });
});
