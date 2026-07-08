import type {
  CheckIn,
  FutureSelf,
  IdentityUpdate,
  ThemeChange,
} from "@/types/database";
import { isDifficultCheckInTheme } from "@/lib/check-in-themes";
import { CHECK_IN_THEME_NAMES, type CheckInThemeName, type ThemeName } from "@/types/enums";

export type MockCurrentSelfDraft = {
  title: string;
  summary: string;
  themes: CheckInThemeName[];
  values: string[];              // exactly 3 — "Name\nEvidence paragraph" pairs naming a tradeoff, strongest first
  afraid_of_becoming: string[];  // 1–3 "Theme\nStatement\nParagraph" feared-future portraits, derived from avoidance signals independent of the values above
  core_tension: string;          // the single most important recurring contradiction
  core_tradeoff?: string | null;  // "Strength\nTradeoff\nObservation" — the recurring cost of this identity, or null/omitted when evidence is too weak
  recent_growth: string[];       // up to 3 sentences describing how identity is evolving
};

const THEME_COUNT_MIN = 4;
const THEME_COUNT_MAX = 6;

function themeChangeWeight(change: ThemeChange): number {
  if (change.direction === "strengthened") {
    return 3;
  }

  if (change.direction === "emerging") {
    return 2;
  }

  return 1;
}

function aggregateThemes(input: {
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes">[];
  identityUpdates: Pick<IdentityUpdate, "themes">[];
  futureSelves: Pick<FutureSelf, "themes" | "percentage">[];
}): CheckInThemeName[] {
  const scores = new Map<string, number>();

  for (const theme of input.pathThemes) {
    scores.set(theme, (scores.get(theme) ?? 0) + 1);
  }

  // Check-in theme_changes are the only source that can surface difficult
  // themes (Disappointment, Hurt, Uncertainty, ...) — paths, identity
  // updates, and future selves only ever carry the positive vocabulary.
  for (const checkIn of input.checkIns) {
    for (const change of checkIn.theme_changes) {
      scores.set(
        change.theme,
        (scores.get(change.theme) ?? 0) + themeChangeWeight(change) * 3,
      );
    }
  }

  for (const update of input.identityUpdates) {
    for (const theme of update.themes) {
      scores.set(theme, (scores.get(theme) ?? 0) + 2);
    }
  }

  for (const futureSelf of input.futureSelves) {
    for (const theme of futureSelf.themes) {
      scores.set(
        theme,
        (scores.get(theme) ?? 0) + Math.max(1, Math.round(futureSelf.percentage / 25)),
      );
    }
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme as CheckInThemeName);

  const selected = ranked.slice(0, THEME_COUNT_MAX);

  if (selected.length >= THEME_COUNT_MIN) {
    return selected;
  }

  // Thin evidence: pad with unused themes (deterministic order) so the
  // output still satisfies the schema's 4-theme floor, without claiming
  // those padding themes have particular support.
  const remaining = CHECK_IN_THEME_NAMES.filter((theme) => !selected.includes(theme));
  return [...selected, ...remaining].slice(0, THEME_COUNT_MIN);
}

function formatThemeList(themes: CheckInThemeName[]): string {
  if (themes.length === 0) {
    return "your recurring patterns";
  }

  if (themes.length === 1) {
    return themes[0];
  }

  if (themes.length === 2) {
    return `${themes[0]} and ${themes[1]}`;
  }

  return `${themes[0]}, ${themes[1]}, and ${themes[2]}`;
}

export function generateMockCurrentSelf(input: {
  momentCount: number;
  checkInCount: number;
  activeFutureSelves: FutureSelf[];
  pathThemes: ThemeName[];
  checkIns: Pick<CheckIn, "theme_changes" | "identity_impact">[];
  identityUpdates: Pick<IdentityUpdate, "title" | "summary" | "themes">[];
}): MockCurrentSelfDraft | null {
  if (
    input.momentCount < 1 ||
    input.checkInCount < 1 ||
    input.activeFutureSelves.length < 1
  ) {
    return null;
  }

  const themes = aggregateThemes({
    pathThemes: input.pathThemes,
    checkIns: input.checkIns,
    identityUpdates: input.identityUpdates,
    futureSelves: input.activeFutureSelves,
  });

  const sortedFutures = [...input.activeFutureSelves].sort(
    (a, b) => b.percentage - a.percentage,
  );
  const leadingFuture = sortedFutures[0];
  const secondaryFuture = sortedFutures[1];
  const recentUpdate = input.identityUpdates[0];
  const themePhrase = formatThemeList(themes);
  const difficultTheme = themes.find((theme) => isDifficultCheckInTheme(theme));

  const primaryTheme = themes[0]?.toLowerCase() ?? "independence";
  const futureLabel = leadingFuture.name.toLowerCase();
  const secondaryLabel = secondaryFuture?.name.toLowerCase();

  // Title: short character phrase, not event-driven
  const title = secondaryLabel
    ? `Moving toward ${futureLabel}`
    : `Building toward ${futureLabel}`;

  // Summary: 2-3 short paragraphs, second person, character-driven
  const para1 = `You tend to move before you have everything figured out. ${themes[0] ? `${themes[0]} runs through most of your decisions` : "Action tends to come before certainty"}.`;

  const para2 = secondaryFuture
    ? `You seem pulled in two directions — toward ${futureLabel} and toward ${secondaryLabel}. That tension isn't confusion; it's just where you are right now.`
    : `You appear to learn more through doing than through planning. Once you've decided on a direction, you commit.`;

  const para3 = difficultTheme
    ? `You don't always resolve things cleanly. ${difficultTheme} surfaces and you sit with it rather than immediately fixing it.`
    : recentUpdate
      ? `You've shown a consistent pattern: when something shifts, you adapt quickly rather than holding the old position.`
      : null;

  const summary = [para1, para2, para3].filter(Boolean).join("\n\n");

  // What You Value — exactly 3, each naming a tradeoff (what competed, what
  // repeatedly won) rather than a theme tag. Not derived from `themes`.
  const values = [
    "Freedom\nWhen certainty and autonomy compete, you keep giving up the certainty, and that choice shows up across very different situations, not one repeated one. When a path offers more security but less room to decide for yourself, you consistently pass on it.",
    `Growth\nYou keep accepting discomfort over comfort because ${futureLabel} matters more than the easier option sitting right next to it — the same call, made again, in situations that otherwise have nothing in common.`,
    "Momentum\nWhen waiting and acting compete, acting keeps winning — you consistently choose to move before every condition is settled, across enough different decisions that it reads as a pattern rather than a single choice.",
  ];

  // What You Fear Becoming — the sibling of the values list, same three-part
  // shape: "Theme\nIdentity statement\nSupporting paragraph". Each fear is a
  // FUTURE VERSION OF THIS PERSON the reader can picture becoming, not an
  // abstract trait or the opposite of a value. Derived independently from
  // actual avoidance signals (a real competing pull, real friction present,
  // real movement away from an old position), NOT by negating the values
  // above. Tone is protective, not frightening.
  const encodeFear = (theme: string, statement: string, paragraph: string) =>
    `${theme}\n${statement}\n${paragraph}`;

  const afraidCandidates: string[] = [];

  if (secondaryLabel) {
    afraidCandidates.push(
      encodeFear(
        "Resignation",
        `Becoming someone who picked ${futureLabel} just to make the pull toward ${secondaryLabel} finally go quiet.`,
        `You keep holding both directions open instead of collapsing the tension early, and that patience shows up across different decisions. Each time you refuse to resolve the pull prematurely, you steer away from the version of you who chose the quiet life over the honest one and spent years wondering about the road not taken.`,
      ),
    );
  }
  if (difficultTheme) {
    afraidCandidates.push(
      encodeFear(
        "Passivity",
        `Becoming someone who let ${difficultTheme.toLowerCase()} quietly make the big decisions for them.`,
        `When ${difficultTheme.toLowerCase()} surfaces you tend to name it and sit with it rather than let it steer, and that keeps happening. This is the version of you who mistook a hard feeling for a verdict — and your habit of deciding for yourself is exactly what keeps that future from taking hold.`,
      ),
    );
  }
  if (recentUpdate) {
    afraidCandidates.push(
      encodeFear(
        "Inertia",
        "Becoming someone who stayed somewhere they'd already outgrown because leaving felt riskier than staying.",
        "You've shown a pattern of moving on once a chapter is genuinely finished, rather than clinging to the familiar. The version of you who confused comfort for home doesn't arrive in one decision — they get there one deferred leap at a time, and you keep declining that trade.",
      ),
    );
  }

  // Every account has at least one groundable avoidance pattern from the
  // base action-oriented evidence, so this never returns empty.
  const afraid_of_becoming =
    afraidCandidates.length > 0
      ? afraidCandidates.slice(0, 3)
      : [
          encodeFear(
            "Hesitation",
            "Becoming someone who waited for certainty until the moment worth moving for had already passed.",
            "You consistently choose to act before every condition is settled, across enough different decisions that it reads as who you are. That instinct is what keeps this future at a distance — the version of you who waited so long that life quietly made the choices instead.",
          ),
        ];

  // Your Biggest Tension — the single most important recurring contradiction.
  const core_tension = secondaryLabel
    ? `You want ${futureLabel}. You also want ${secondaryLabel}. Nearly every major decision you've recorded has required choosing one over the other.`
    : `You trust your own judgment deeply. You still wish someone understood what building toward ${futureLabel} has actually cost you.`;

  // The Tradeoff You Live With — exactly ONE tradeoff, encoded
  // "Recurring pattern\nThe tradeoff\nReflection's observation". Both halves
  // describe the same behavior: not a flaw, the natural consequence of a
  // recurring pattern. Grounded in the same action-oriented pattern the rest of
  // the portrait is built from, so it's always at least weakly supported here.
  const core_tradeoff = [
    "You commit to a direction as soon as it feels right, before you've fully weighed it.",
    "That decisiveness is a real part of how you've moved forward while others stalled. But it also means you rarely reopen a choice once it's made, so a direction can keep its momentum well after it has stopped fitting who you're becoming.",
    "This same pattern surfaces again and again across your situations, check-ins, and reflections, not in any single decision alone.",
  ].join("\n");

  // What's Changing: up to 3 sentences describing evolution, not isolated phrases.
  const recent_growth = [
    `Recently you've become noticeably more comfortable trusting ${primaryTheme} without waiting for outside confirmation.`,
    secondaryLabel
      ? `You're increasingly willing to sit with the pull between ${futureLabel} and ${secondaryLabel} instead of forcing an early resolution.`
      : `You're committing more fully to ${futureLabel} with less deliberation than before.`,
    difficultTheme
      ? `You're starting to name ${difficultTheme.toLowerCase()} directly instead of only sitting with it privately.`
      : null,
  ].filter((item): item is string => item !== null);

  return {
    title,
    summary,
    themes,
    values,
    afraid_of_becoming,
    core_tension,
    core_tradeoff,
    recent_growth,
  };
}
