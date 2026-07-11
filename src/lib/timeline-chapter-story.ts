import type { ThemeChange } from "@/types/database";
import type { ThemeChangeDirection } from "@/types/enums";

/**
 * Presentation-only derivation for the Timeline's chapter view: turns the
 * month's raw evidence (check-ins, moments, chosen paths) into the three
 * story-shaped pieces the chapter card renders — identity shifts with signed
 * magnitudes, per-situation beginning→end storylines, and a closing
 * reflection sentence.
 *
 * This module deliberately does NOT extend MonthlyIdentityEvolution: that
 * bundle is serialized into AI prompts (lib/ai/context), so adding fields
 * there would change generation input. Everything here is computed at read
 * time from its own narrow selects and never persisted.
 */

export type IdentityShift = {
  /** Check-in theme name, e.g. "Courage" or "Loneliness". */
  theme: string;
  /**
   * Net evidence movement across the month's check-ins: +1 per check-in that
   * marked the theme as strengthened/emerging/present/processing, −1 per
   * check-in that marked it weakened/fading. Not a judgment — Loneliness can
   * rise and Courage can fall; both render the same way.
   */
  value: number;
};

export type ChapterStoryline = {
  momentId: string;
  /** The situation's own title — the storyline's heading. */
  title: string;
  /** Where the situation stood as the month opened; null when unknown or identical to the end state. */
  beginning: string | null;
  /** Where it stood as the month closed — one or two short lines. */
  end: string[];
  /** Evidence volume this month (check-ins + chosen paths); ranks storylines. */
  weight: number;
};

export type ChapterStory = {
  /** Month label matching MonthlyIdentityNarrative.month, e.g. "July 2026". */
  month: string;
  /** Sorted by absolute magnitude, capped at 5, zero-net themes dropped. */
  identityShifts: IdentityShift[];
  /** Sorted most-meaningful first (weight, then recency). */
  storylines: ChapterStoryline[];
  /** One sentence tying the internal shifts to the situations that carried them. */
  closingReflection: string | null;
};

// --- inputs (plain shapes so the derivation is testable without supabase) ---

export type ChapterMomentInput = {
  id: string;
  title: string;
  description: string | null;
  currentUnderstanding: string | null;
  createdAt: string;
};

export type ChapterCheckInInput = {
  momentId: string;
  realitySummary: string;
  identityImpact: string;
  themeChanges: ThemeChange[];
  createdAt: string;
};

export type ChapterChosenPathInput = {
  momentId: string;
  /** Already-decoded path title (native title or first sentence of description). */
  title: string;
  chosenAt: string;
};

const MAX_IDENTITY_SHIFTS = 5;
const MAX_STORYLINE_LINE_LENGTH = 160;

// Same UTC month-grouping as lib/monthly-identity-evolution.ts, reimplemented
// here because that module's helpers are private and it must stay untouched
// (its output feeds AI context).
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

function monthKeyOf(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Splits prose into sentences for bullet rendering. Keeps the terminal
 * punctuation with each sentence; a trailing fragment without punctuation
 * still becomes a bullet.
 */
export function splitIntoSentences(text: string): string[] {
  const matches = text.trim().match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g);
  return (matches ?? []).map((sentence) => sentence.trim()).filter(Boolean);
}

// Every direction is either evidence the theme was alive in the month
// (strengthened/emerging for positive themes, present/processing for
// difficult ones) or evidence it was receding (weakened/fading). No
// direction is scored as good or bad — only as more or less present.
const DIRECTION_SCORE: Record<ThemeChangeDirection, number> = {
  strengthened: 1,
  emerging: 1,
  present: 1,
  processing: 1,
  weakened: -1,
  fading: -1,
};

/**
 * Nets each theme's movement across a month of check-ins and keeps the
 * largest movements by absolute magnitude — deliberately unsplit by
 * direction, so "Loneliness +3" and "Courage −2" sit in the same list.
 */
export function computeIdentityShifts(
  themeChangesPerCheckIn: ThemeChange[][],
): IdentityShift[] {
  const netByTheme = new Map<string, number>();
  const mentionsByTheme = new Map<string, number>();

  for (const changes of themeChangesPerCheckIn) {
    for (const change of changes) {
      const score = DIRECTION_SCORE[change.direction] ?? 0;
      netByTheme.set(change.theme, (netByTheme.get(change.theme) ?? 0) + score);
      mentionsByTheme.set(change.theme, (mentionsByTheme.get(change.theme) ?? 0) + 1);
    }
  }

  return [...netByTheme.entries()]
    .filter(([, value]) => value !== 0)
    .sort(
      (a, b) =>
        Math.abs(b[1]) - Math.abs(a[1]) ||
        (mentionsByTheme.get(b[0]) ?? 0) - (mentionsByTheme.get(a[0]) ?? 0),
    )
    .slice(0, MAX_IDENTITY_SHIFTS)
    .map(([theme, value]) => ({ theme, value }));
}

/** First sentence, trimmed to a length that reads as one storyline line. */
function storyLine(text: string | null | undefined): string | null {
  if (!text) return null;
  const [first] = splitIntoSentences(text);
  if (!first) return null;
  if (first.length <= MAX_STORYLINE_LINE_LENGTH) return first;
  const cut = first.slice(0, MAX_STORYLINE_LINE_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : MAX_STORYLINE_LINE_LENGTH).trimEnd()}…`;
}

function byCreatedAtAsc<T extends { createdAt: string }>(a: T, b: T): number {
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * One storyline per situation active in the month. The beginning is the
 * earliest honest statement of where things stood (the situation as first
 * described if it started this month, otherwise the month's first check-in),
 * and the end is the last check-in's reality — plus its identity impact,
 * which is where lines like "You found it harder to open up afterwards"
 * come from. A situation whose only event was choosing a path ends on the
 * path chosen. Nothing here is generated; every line is a first sentence of
 * text the user (or an existing generation step) already wrote.
 */
export function buildStoryline(
  monthKey: string,
  moment: ChapterMomentInput,
  monthCheckIns: ChapterCheckInInput[],
  monthChosenPaths: ChapterChosenPathInput[],
): ChapterStoryline | null {
  const checkIns = [...monthCheckIns].sort(byCreatedAtAsc);
  const startedThisMonth = monthKeyOf(moment.createdAt) === monthKey;

  let beginning: string | null;
  if (startedThisMonth) {
    beginning = storyLine(moment.description) ?? storyLine(moment.currentUnderstanding);
  } else if (checkIns.length >= 2) {
    beginning = storyLine(checkIns[0].realitySummary);
  } else {
    beginning =
      storyLine(moment.currentUnderstanding) ?? storyLine(moment.description);
  }

  let end: string[] = [];
  const lastCheckIn = checkIns[checkIns.length - 1];
  if (lastCheckIn) {
    const reality = storyLine(lastCheckIn.realitySummary);
    const impact = storyLine(lastCheckIn.identityImpact);
    end = [...new Set([reality, impact].filter((line): line is string => line !== null))];
  } else if (monthChosenPaths.length > 0) {
    const latestPath = [...monthChosenPaths].sort((a, b) =>
      b.chosenAt.localeCompare(a.chosenAt),
    )[0];
    end = [`You chose a path: ${latestPath.title.replace(/\.$/, "")}.`];
  }

  if (end.length === 0) {
    return null;
  }
  if (beginning !== null && beginning === end[0]) {
    beginning = null;
  }

  return {
    momentId: moment.id,
    title: moment.title,
    beginning,
    end,
    weight: monthCheckIns.length + monthChosenPaths.length,
  };
}

/**
 * One comparative movement phrase per theme and direction. Comparative on
 * purpose: a shift only evidences *movement* ("more isolated"), never the
 * absolute state someone started from ("felt socially connected" was Phase
 * 2's invention — plausible, symmetric, and unsupported). Every phrase here
 * is true whenever its direction is true, so the presentation can never
 * confidently state something the evidence doesn't back. Judgment-free in
 * both directions: rising Loneliness and rising Courage read the same way.
 */
const IDENTITY_MOVEMENTS: Record<string, { up: string; down: string }> = {
  Connection: {
    up: "Investing more in the people around you.",
    down: "Investing less in the people around you.",
  },
  Independence: {
    up: "More comfortable deciding alone.",
    down: "Less comfortable deciding alone.",
  },
  Curiosity: {
    up: "More open to options you hadn't considered.",
    down: "Less open to options you hadn't considered.",
  },
  Stability: {
    up: "Placing more weight on stability.",
    down: "Placing less weight on stability.",
  },
  Creativity: {
    up: "More drawn to making something new.",
    down: "Less drawn to making something new.",
  },
  Growth: {
    up: "More willing to step into the unknown.",
    down: "Less willing to step into the unknown.",
  },
  Belonging: {
    up: "More invested in belonging.",
    down: "Less invested in belonging.",
  },
  Leadership: {
    up: "More willing to carry responsibility.",
    down: "Less willing to carry responsibility.",
  },
  Reflection: {
    up: "Examining your own patterns more.",
    down: "Examining your own patterns less.",
  },
  Courage: {
    up: "More willing to act without certainty.",
    down: "Less willing to act without certainty.",
  },
  Loneliness: {
    up: "More isolated.",
    down: "Less isolated.",
  },
  Disappointment: {
    up: "Carrying more disappointment.",
    down: "Carrying less disappointment.",
  },
  Grief: {
    up: "Grief closer to the surface.",
    down: "Grief weighing less.",
  },
  Frustration: {
    up: "More frustrated by the gap between effort and results.",
    down: "Less frustrated by the gap between effort and results.",
  },
  Uncertainty: {
    up: "Living with more open questions.",
    down: "Living with fewer open questions.",
  },
  Hurt: {
    up: "Carrying more hurt.",
    down: "Carrying less hurt.",
  },
  Acceptance: {
    up: "More at peace with how things are.",
    down: "Less at peace with how things are.",
  },
  Resilience: {
    up: "Recovering faster from setbacks.",
    down: "Recovering more slowly from setbacks.",
  },
};

/**
 * IdentityJourney is deliberately just two lists of sentences: the chapter
 * layout renders whatever strings arrive here. A future generation phase can
 * replace composeIdentityJourney with bespoke AI-written monthly bullets by
 * returning this same shape — no component changes required.
 */
export type IdentityJourney = {
  /**
   * Who this person was entering the month — evidenced by the PREVIOUS
   * month's recorded movement, never inferred by inverting this month's.
   * Empty when the prior month offers no evidence: truth before symmetry.
   */
  beginning: string[];
  /** How this month actually moved them — one phrase per recorded shift. */
  end: string[];
};

const MAX_JOURNEY_BULLETS = 4;

function movementPhrases(shifts: IdentityShift[]): string[] {
  return shifts.slice(0, MAX_JOURNEY_BULLETS).flatMap((shift) => {
    const movement = IDENTITY_MOVEMENTS[shift.theme];
    if (!movement) return [];
    return [shift.value > 0 ? movement.up : movement.down];
  });
}

/**
 * The chapter's Beginning → End comparison, built only from recorded
 * movement. The end is this month's shifts; the beginning is the previous
 * month's shifts — the state the last chapter actually left the person in.
 * When there is no prior evidence the beginning stays empty and the section
 * renders end-only, rather than inventing a balanced "before" (Phase 2's
 * pole inversion could claim "Invested in the people around you." in a month
 * whose evidence said the opposite). Falls back to the deterministic month
 * comparison for the end when a month has no magnitudes, and returns null
 * when there is no identity evidence at all.
 */
export function composeIdentityJourney(
  identityShifts: IdentityShift[],
  previousShifts: IdentityShift[],
  comparison: { traitsMorePresent: string[]; traitsLessPresent: string[] },
): IdentityJourney | null {
  let end = movementPhrases(identityShifts);

  if (end.length === 0) {
    end = movementPhrases([
      ...comparison.traitsMorePresent.map((theme) => ({ theme, value: 1 })),
      ...comparison.traitsLessPresent.map((theme) => ({ theme, value: -1 })),
    ]);
  }

  if (end.length === 0) {
    return null;
  }

  return { beginning: movementPhrases(previousShifts), end };
}

function lowercaseTheme(theme: string): string {
  return theme.toLowerCase();
}

/**
 * The chapter's last line: internal change (largest shifts, direction kept,
 * never judged) tied to the external situations that carried it. Purely
 * deterministic — the same template family as the existing "You became
 * more …" statements, so no new generation is introduced.
 */
export function composeClosingReflection(
  month: string,
  identityShifts: IdentityShift[],
  storylines: ChapterStoryline[],
): string | null {
  if (identityShifts.length === 0) {
    return null;
  }

  const monthName = month.split(" ")[0];
  const movements = identityShifts
    .slice(0, 2)
    .map(
      (shift) =>
        `${shift.value > 0 ? "more" : "less"} ${lowercaseTheme(shift.theme)}`,
    )
    .join(" and ");

  const storyNames = storylines.slice(0, 2).map((storyline) => storyline.title);
  const storyClause =
    storyNames.length === 0
      ? ""
      : storyNames.length === 1
        ? ` — most of that change was written in ${storyNames[0]}`
        : ` — most of that change was written in ${storyNames[0]} and ${storyNames[1]}`;

  return `You carried ${movements} out of ${monthName} than you brought in${storyClause}.`;
}

/**
 * Groups the raw evidence by UTC calendar month and derives one ChapterStory
 * per month that had a check-in or a chosen path, keyed by the same month
 * label the narratives use ("July 2026"). Months whose only activity was
 * elsewhere (identity updates, future-self events) simply have no story —
 * the chapter card omits those sections.
 */
export function buildChapterStories(
  moments: ChapterMomentInput[],
  checkIns: ChapterCheckInInput[],
  chosenPaths: ChapterChosenPathInput[],
): Map<string, ChapterStory> {
  const momentById = new Map(moments.map((moment) => [moment.id, moment]));

  const monthKeys = new Set<string>([
    ...checkIns.map((checkIn) => monthKeyOf(checkIn.createdAt)),
    ...chosenPaths.map((path) => monthKeyOf(path.chosenAt)),
  ]);

  const stories = new Map<string, ChapterStory>();

  for (const monthKey of monthKeys) {
    const monthCheckIns = checkIns.filter(
      (checkIn) => monthKeyOf(checkIn.createdAt) === monthKey,
    );
    const monthPaths = chosenPaths.filter(
      (path) => monthKeyOf(path.chosenAt) === monthKey,
    );

    const identityShifts = computeIdentityShifts(
      monthCheckIns.map((checkIn) => checkIn.themeChanges),
    );

    const activeMomentIds = [
      ...new Set([
        ...monthCheckIns.map((checkIn) => checkIn.momentId),
        ...monthPaths.map((path) => path.momentId),
      ]),
    ];

    const latestActivityByMoment = new Map<string, string>();
    for (const checkIn of monthCheckIns) {
      const current = latestActivityByMoment.get(checkIn.momentId) ?? "";
      if (checkIn.createdAt > current) {
        latestActivityByMoment.set(checkIn.momentId, checkIn.createdAt);
      }
    }
    for (const path of monthPaths) {
      const current = latestActivityByMoment.get(path.momentId) ?? "";
      if (path.chosenAt > current) {
        latestActivityByMoment.set(path.momentId, path.chosenAt);
      }
    }

    const storylines = activeMomentIds
      .flatMap((momentId) => {
        const moment = momentById.get(momentId);
        if (!moment) return [];
        const storyline = buildStoryline(
          monthKey,
          moment,
          monthCheckIns.filter((checkIn) => checkIn.momentId === momentId),
          monthPaths.filter((path) => path.momentId === momentId),
        );
        return storyline ? [storyline] : [];
      })
      .sort(
        (a, b) =>
          b.weight - a.weight ||
          (latestActivityByMoment.get(b.momentId) ?? "").localeCompare(
            latestActivityByMoment.get(a.momentId) ?? "",
          ),
      );

    const month = monthLabelOf(monthKey);
    stories.set(month, {
      month,
      identityShifts,
      storylines,
      closingReflection: composeClosingReflection(month, identityShifts, storylines),
    });
  }

  return stories;
}
