import { isDifficultCheckInTheme } from "@/lib/check-in-themes";
import type { CheckInThemeName } from "@/types/enums";

/**
 * Fallback synthesis for "What You Value" / "What You Fear Becoming" when a
 * Current Self row was generated before those fields existed, or an AI
 * generation returned them empty. Themes are already the distilled,
 * evidence-grounded signal behind the portrait — aggregated by the generator
 * from situations, check-ins, reflection answers, identity updates, and
 * Future Selves — so deriving from them here is synthesis, not invention.
 * Display-only: never persisted, so it's superseded the moment the row is
 * regenerated with real values.
 *
 * Values and fears are deliberately NOT derived as mirror images of each
 * other. A value is drawn from what a theme's presence says this person
 * repeatedly chooses; a fear is drawn independently from the full theme
 * list (including difficult themes, which values never use) — so two rows
 * that land on the same value can still surface different fears, the way
 * two people who share a value can fear different things because they've
 * lived different evidence.
 */

type ThemeValue = {
  value: string;
  evidence: string;
};

// Positive themes only — a value is a repeated choice, not a struggle.
const THEME_VALUE_MAP: Partial<Record<CheckInThemeName, ThemeValue>> = {
  Courage: {
    value: "Courage",
    evidence:
      "You keep choosing the harder, more honest option instead of the safe one — it shows up again and again.",
  },
  Connection: {
    value: "Connection",
    evidence:
      "You keep investing in the relationships that matter, even when it would be easier not to.",
  },
  Stability: {
    value: "Stability",
    evidence:
      "You keep building toward something steady, even while other parts of your life stay in motion.",
  },
  Independence: {
    value: "Freedom",
    evidence:
      "You keep choosing to decide for yourself, even when it would be easier to let someone else decide.",
  },
  Reflection: {
    value: "Self-understanding",
    evidence:
      "You keep coming back to examine your own choices instead of just moving past them.",
  },
  Growth: {
    value: "Growth",
    evidence:
      "You keep choosing what stretches you over what's easy — it shows up across multiple situations and check-ins.",
  },
  Belonging: {
    value: "Belonging",
    evidence:
      "You keep choosing to show up fully in the places and relationships you care about.",
  },
  Curiosity: {
    value: "Growth",
    evidence:
      "You keep following what you don't understand yet instead of settling for the familiar.",
  },
  Leadership: {
    value: "Leadership",
    evidence: "You keep stepping toward responsibility instead of away from it.",
  },
  Creativity: {
    value: "Creativity",
    evidence: "You keep making something rather than just consuming what already exists.",
  },
};

// Covers both positive and difficult themes — a fear can come from a
// repeated struggle just as legitimately as from the shadow of something
// pursued. This is intentionally a separate vocabulary from THEME_VALUE_MAP,
// not its mirror. Each fear is the sibling of a value: a three-part portrait
// of a future identity — a short theme label, a one-sentence identity
// statement (the emotional centerpiece), and a supporting paragraph that
// grounds it and shows the person moving away from that future. The tone is
// protective, never frightening. Encoded downstream as
// "Theme\nStatement\nParagraph", the same newline convention values use.
type ThemeFear = { theme: string; statement: string; paragraph: string };

const THEME_FEAR_MAP: Partial<Record<CheckInThemeName, ThemeFear>> = {
  // Difficult themes: direct evidence of a repeated avoidance pattern.
  Loneliness: {
    theme: "Isolation",
    statement: "Becoming someone who quietly convinced themselves they don't need anyone.",
    paragraph:
      "You keep reaching toward connection even when withdrawing would be simpler, and that reaching is what matters here. The person who stops reaching doesn't arrive in a single moment — they get there one unanswered impulse at a time, and your choices keep refusing that slow drift.",
  },
  Disappointment: {
    theme: "Resignation",
    statement:
      "Becoming someone who lowered what they expected from life so it could never let them down again.",
    paragraph:
      "Each time you keep hoping for something better instead of bracing for less, you steer away from this future. The risk was never a single letdown — it's the quiet decision to want less so nothing can hurt, and you keep choosing to want fully instead.",
  },
  Grief: {
    theme: "Avoidance",
    statement:
      "Becoming someone who moved on so fast they never let themselves feel what they lost.",
    paragraph:
      "You've shown a willingness to stay with hard things rather than outrun them. This future belongs to the version of you who keeps busy to avoid the ache — and the fact that you slow down and let it land is what keeps that version at a distance.",
  },
  Frustration: {
    theme: "Surrender",
    statement:
      "Becoming someone who let frustration talk them out of the things that still mattered.",
    paragraph:
      "When something matters and turns hard, you tend to stay with it rather than walk. This is the version of you who mistook a difficult season for a closed door — and each time you push through the friction instead of quitting on what you care about, you refuse to become them.",
  },
  Uncertainty: {
    theme: "Passivity",
    statement: "Becoming someone who let uncertainty make their biggest decisions for them.",
    paragraph:
      "You keep choosing to decide even when the picture isn't complete. This future is the one where not-knowing becomes a reason to never move, and waiting hardens into a way of life — and your pattern of acting before everything is settled is what keeps it from taking hold.",
  },
  Hurt: {
    theme: "Withdrawal",
    statement: "Becoming someone who closed themselves off so nothing could reach them again.",
    paragraph:
      "You keep letting people and experiences in even after they've cost you something. The sealed-off version of you would be safer and smaller — and every time you stay open instead of armored, you move further from becoming them.",
  },
  Acceptance: {
    theme: "Complacency",
    statement:
      "Becoming someone who made peace with things they were never actually at peace with.",
    paragraph:
      "There's a difference between accepting what you can't change and quietly giving up, and your choices keep landing on the honest side of that line. This future is the one where 'it's fine' becomes a way to stop trying — and you keep declining to say it before it's true.",
  },
  Resilience: {
    theme: "Self-reliance",
    statement:
      "Becoming someone so used to carrying everything alone that they forgot they were allowed to put it down.",
    paragraph:
      "You've proven you can hold a lot, which is exactly why this version is a real risk rather than a distant one. The danger isn't weakness; it's strength that never rests — and the moments you let something be shared instead of shouldered are what keep this future from becoming permanent.",
  },
  // Positive themes: what tends to get avoided alongside pursuing them —
  // named independently, not as the literal negation of the value above.
  Courage: {
    theme: "Settling",
    statement:
      "Becoming someone who played it safe so many times that safe became who they were.",
    paragraph:
      "The braver call is the one you keep making when the safe one is right there. This future arrives quietly — not through one act of cowardice but through a hundred small retreats — and your repeated willingness to do the harder thing is what keeps it from ever being written.",
  },
  Connection: {
    theme: "Isolation",
    statement:
      "Becoming someone so self-sufficient that they slowly stopped letting anyone close.",
    paragraph:
      "You put real energy into the people who matter, even when pulling back would cost you less. The version of you who needs no one would look strong from the outside and feel hollow from within — and every time you choose to stay in relationship, you move away from them.",
  },
  Stability: {
    theme: "Stagnation",
    statement:
      "Becoming someone who built a life that depended entirely on nothing ever changing.",
    paragraph:
      "You build toward something steady without letting it harden into a cage. This is the version of you who mistook comfort for a life and stopped growing to protect it — and your willingness to keep moving even from within stability is what keeps that future at bay.",
  },
  Independence: {
    theme: "Conformity",
    statement:
      "Becoming someone who slowly handed the direction of their life to everyone but themselves.",
    paragraph:
      "Making your own call is something you keep doing, even when handing the decision off would be easier. This future belongs to the version of you who woke up inside a life they never actually picked — and each decision you make on your own terms is a refusal to become them.",
  },
  Reflection: {
    theme: "Avoidance",
    statement:
      "Becoming someone who repeated the same pattern for years without ever really looking at it.",
    paragraph:
      "You turn back to look honestly at your own patterns rather than glossing past them. The unexamined version of you would repeat the same loop and call it fate — and your habit of actually looking is what keeps that from becoming your story.",
  },
  Growth: {
    theme: "Stagnation",
    statement:
      "Becoming someone who got comfortable long before they became who they could be.",
    paragraph:
      "You reach for what stretches you instead of what's easy, again and again. This future is the one where comfort arrived early and quietly ended the growing — and each time you pick the harder, more alive option, you push that ending further away.",
  },
  Belonging: {
    theme: "Inertia",
    statement:
      "Becoming someone who stayed somewhere they'd already outgrown because leaving felt riskier than staying.",
    paragraph:
      "You gravitate toward where you actually belong instead of settling for wherever you happened to land. This version confused familiarity for home — and your willingness to move toward genuine belonging is what keeps you from becoming them.",
  },
  Curiosity: {
    theme: "Disengagement",
    statement: "Becoming someone who slowly lost interest in their own life.",
    paragraph:
      "You let curiosity pull you somewhere new instead of coasting on the familiar. The incurious version of you wouldn't be unhappy exactly — just switched off — and every question you chase instead of ignoring is a step away from that quiet dimming.",
  },
  Leadership: {
    theme: "Diminishment",
    statement: "Becoming someone who stayed small so they'd never have to be seen.",
    paragraph:
      "You move toward responsibility rather than ducking it. This future is the one where playing invisible felt safer than being accountable — and each time you step forward instead of shrinking, you refuse the version of you who disappeared on purpose.",
  },
  Creativity: {
    theme: "Silence",
    statement: "Becoming someone who let their own voice go quiet.",
    paragraph:
      "You bring something into being rather than only taking in what others have made. The silenced version of you would have plenty of reasons and nothing to show for them — and every time you make the thing instead of deferring it, you keep that future unwritten.",
  },
};

const MAX_VALUES = 3;
const MAX_FEARS = 3;

function encodeFear(fear: ThemeFear): string {
  return `${fear.theme}\n${fear.statement}\n${fear.paragraph}`;
}

/** "Name\nEvidence" strings, same format the generator produces — up to 3, merged, only for themes with a grounded mapping. */
export function deriveValuesFromThemes(
  themes: readonly CheckInThemeName[] | null | undefined,
): string[] {
  const values: ThemeValue[] = [];

  for (const theme of themes ?? []) {
    const mapping = THEME_VALUE_MAP[theme];
    if (mapping && !values.some((v) => v.value === mapping.value)) {
      values.push(mapping);
    }
    if (values.length >= MAX_VALUES) {
      break;
    }
  }

  return values.map((v) => `${v.value}\n${v.evidence}`);
}

/**
 * Derived independently from the full theme list — not the values above.
 * Difficult themes (real, repeated friction) surface first as the most
 * direct avoidance evidence; positive-theme avoidance patterns fill any
 * remaining slots. Never more than 3, never padded.
 */
export function deriveFearsFromThemes(
  themes: readonly CheckInThemeName[] | null | undefined,
): string[] {
  const fears: ThemeFear[] = [];
  const seenThemes = new Set<string>();
  const themeList = themes ?? [];

  // De-dup by the future-identity label, not the encoded string: two source
  // themes can map to the same feared identity (e.g. Loneliness and
  // Connection both surface "Isolation"), and the card must not show two rows
  // under the same theme.
  const addFear = (fear: ThemeFear | undefined): boolean => {
    if (!fear || seenThemes.has(fear.theme)) {
      return false;
    }
    seenThemes.add(fear.theme);
    fears.push(fear);
    return fears.length >= MAX_FEARS;
  };

  // Difficult themes first — the most direct evidence of a repeated struggle.
  for (const theme of themeList) {
    if (!isDifficultCheckInTheme(theme)) {
      continue;
    }
    if (addFear(THEME_FEAR_MAP[theme])) {
      return fears.map(encodeFear);
    }
  }

  for (const theme of themeList) {
    if (addFear(THEME_FEAR_MAP[theme])) {
      break;
    }
  }

  return fears.map(encodeFear);
}
