import type { CheckInThemeName } from "@/types/enums";

/**
 * Hero derivations for the Current Self page.
 *
 * Identity foundations answer "what has this person quietly built their
 * identity around?" — the things they repeatedly derive their sense of self
 * from. They are NOT values and NOT personality traits: they are drawn from
 * the same theme evidence the rest of the portrait uses, phrased as identity
 * anchors, exactly the way values and fears are each derived from themes
 * independently (see deriveValuesFromThemes / deriveFearsFromThemes). They are
 * no longer rendered in the hero — they now serve only as the consistency
 * signal (distinct stable anchors) feeding identity confidence below. Never
 * persisted.
 *
 * Identity confidence is a qualitative read of how settled the portrait is,
 * computed from evidence volume and consistency. It never exposes counts.
 */

export type IdentityFoundation = { title: string; sentence: string };

// Positive themes only — a foundation is something identity is built AROUND,
// not a struggle. Each is phrased as an identity anchor ("Becoming more
// capable"), distinct from the value word it may relate to ("Growth").
const THEME_FOUNDATION_MAP: Partial<Record<CheckInThemeName, IdentityFoundation>> = {
  Growth: {
    title: "Becoming more capable",
    sentence:
      "You repeatedly choose situations that stretch you rather than ones that keep you comfortable.",
  },
  Independence: {
    title: "Living on your own terms",
    sentence:
      "Your decisions consistently protect your ability to choose your own direction.",
  },
  Courage: {
    title: "Facing hard things directly",
    sentence: "You keep taking the honest, harder route instead of the safe one.",
  },
  Connection: {
    title: "Staying close to the people who matter",
    sentence:
      "You keep investing in the relationships you care about, even when it costs you.",
  },
  Stability: {
    title: "Building something that lasts",
    sentence:
      "You keep working toward something steady rather than leaving things in flux.",
  },
  Reflection: {
    title: "Understanding yourself",
    sentence:
      "You keep turning back to examine your own choices instead of just moving past them.",
  },
  Belonging: {
    title: "Belonging somewhere real",
    sentence: "You keep showing up fully where you actually belong.",
  },
  Curiosity: {
    title: "Exploring what's possible",
    sentence:
      "You keep following what you don't yet understand instead of settling for the familiar.",
  },
  Leadership: {
    title: "Taking responsibility",
    sentence: "You keep stepping toward responsibility rather than away from it.",
  },
  Creativity: {
    title: "Making something of your own",
    sentence: "You keep creating something rather than only consuming what already exists.",
  },
};

const MAX_FOUNDATIONS = 3;

/**
 * Up to 3 identity foundations, strongest first (themes arrive ordered by
 * strength), de-duped by foundation title so the same idea never repeats in
 * different words. Difficult themes never ground a foundation, so a portrait
 * built only from struggle returns none — which the hero handles as the
 * "still learning" state rather than inventing certainty.
 */
export function deriveIdentityFoundations(
  themes: readonly CheckInThemeName[] | null | undefined,
): IdentityFoundation[] {
  const foundations: IdentityFoundation[] = [];
  const seenTitles = new Set<string>();

  for (const theme of themes ?? []) {
    const foundation = THEME_FOUNDATION_MAP[theme];
    if (foundation && !seenTitles.has(foundation.title)) {
      seenTitles.add(foundation.title);
      foundations.push(foundation);
    }
    if (foundations.length >= MAX_FOUNDATIONS) {
      break;
    }
  }

  return foundations;
}

export type IdentityConfidenceLevel = "high" | "growing" | "early";

export type IdentityConfidence = {
  level: IdentityConfidenceLevel;
  label: string;
  explanation: string;
};

/**
 * Qualitative confidence in the portrait, from evidence volume (check-ins,
 * answered reflections) and consistency (how many distinct, stable identity
 * foundations the behavior supports). Deterministic, never random. The
 * explanation is intentionally qualitative and never mentions counts.
 */
export function deriveIdentityConfidence(input: {
  checkInCount: number;
  reflectionCount: number;
  foundationCount: number;
}): IdentityConfidence {
  const { checkInCount, reflectionCount, foundationCount } = input;

  // Strong: enough consistent behavior across many check-ins that the portrait
  // is unlikely to swing without genuinely new experiences.
  if (checkInCount >= 8 && foundationCount >= 3) {
    return {
      level: "high",
      label: "Strong",
      explanation:
        "Reflection has observed enough consistent behavior that this portrait is unlikely to change dramatically without meaningful new experiences.",
    };
  }

  // Moderate: real patterns are visible but still moving. Either a moderate run
  // of check-ins or a couple of answered reflections, plus at least two
  // distinct foundations, clears this bar.
  if ((checkInCount >= 3 || reflectionCount >= 2) && foundationCount >= 2) {
    return {
      level: "growing",
      label: "Moderate",
      explanation:
        "Clear patterns are emerging, but Reflection expects this portrait to continue evolving.",
    };
  }

  // Weak: not enough consistent evidence yet to commit to a portrait.
  return {
    level: "early",
    label: "Weak",
    explanation:
      "Reflection is still learning who you are. As more decisions and reflections are recorded, this portrait will become more reliable.",
  };
}
