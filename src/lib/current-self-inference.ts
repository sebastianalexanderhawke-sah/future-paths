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
// not its mirror.
const THEME_FEAR_MAP: Partial<Record<CheckInThemeName, string>> = {
  // Difficult themes: direct evidence of a repeated avoidance pattern.
  Loneliness: "Convincing yourself you don't need anyone.",
  Disappointment: "Lowering what you expect from life so it can't disappoint you again.",
  Grief: "Moving on so fast that you never actually process what you lost.",
  Frustration: "Letting frustration talk you out of things that still matter to you.",
  Uncertainty: "Letting uncertainty make the decision for you instead of making it yourself.",
  Hurt: "Closing off so nothing can reach you again.",
  Acceptance: "Accepting things you haven't actually made peace with.",
  Resilience: "Being so used to carrying things alone that you forget you're allowed to put them down.",
  // Positive themes: what tends to get avoided alongside pursuing them —
  // named independently, not as the literal negation of the value above.
  Courage: "Playing it safe until playing it safe becomes who you are.",
  Connection: "Becoming so self-sufficient that you stop letting people in.",
  Stability: "Building a life that depends entirely on staying comfortable.",
  Independence: "Losing the ability to choose your own direction.",
  Reflection: "Repeating the same pattern without ever really looking at it.",
  Growth: "Becoming comfortable before becoming capable.",
  Belonging: "Staying somewhere you've already outgrown because leaving feels riskier than staying.",
  Curiosity: "Losing interest in your own life.",
  Leadership: "Staying small to avoid being seen.",
  Creativity: "Letting your own voice go quiet.",
};

const MAX_VALUES = 3;
const MAX_FEARS = 3;

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
  const fears: string[] = [];
  const themeList = themes ?? [];

  for (const theme of themeList) {
    if (!isDifficultCheckInTheme(theme)) {
      continue;
    }
    const fear = THEME_FEAR_MAP[theme];
    if (fear && !fears.includes(fear)) {
      fears.push(fear);
    }
    if (fears.length >= MAX_FEARS) {
      return fears;
    }
  }

  for (const theme of themeList) {
    const fear = THEME_FEAR_MAP[theme];
    if (fear && !fears.includes(fear)) {
      fears.push(fear);
    }
    if (fears.length >= MAX_FEARS) {
      break;
    }
  }

  return fears;
}
