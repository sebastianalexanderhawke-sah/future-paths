import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";

export type MockMonthlyIdentityNarrativeDraft = {
  month: string;
  headline: string;
  opening_beginning: string;
  opening_end: string;
  why_this_changed: string;
};

// Headline fragments keyed by dominant theme — picked by the month's
// strongest theme so headlines vary with the actual evidence instead of all
// reading the same, while staying deterministic (no randomness) and never
// printing the theme's literal name.
const HEADLINE_BY_THEME: Record<string, string> = {
  Courage: "Acting before certainty became the norm.",
  Independence: "Decisions started being made alone, without waiting for input.",
  Stability: "Stability took priority over preference.",
  Connection: "Reaching out became easier.",
  Growth: "Stepping into the unknown stopped feeling optional.",
  Belonging: "Finding where you belong became a bigger focus.",
  Curiosity: "Following what pulled you mattered more.",
  Leadership: "Carrying responsibility became routine.",
  Reflection: "Old patterns got examined more closely.",
  Creativity: "Making something new took up more time.",
};

const FALLBACK_HEADLINE = "This month brought a shift in how decisions got made.";

function headlineFor(dominantThemes: string[]): string {
  for (const theme of dominantThemes) {
    const headline = HEADLINE_BY_THEME[theme];
    if (headline) return headline;
  }

  return FALLBACK_HEADLINE;
}

function openingBeginningFor(month: MonthlyIdentityEvolution): string {
  return month.majorDecisions.length > 1
    ? "At the beginning of the month, choices were still being made the way they always had been."
    : "At the beginning of the month, little had changed in how decisions got made.";
}

function openingEndFor(month: MonthlyIdentityEvolution): string {
  const topShift = month.futureShifts[0];

  if (topShift && topShift.delta > 0) {
    return "By the end of the month, action came before certainty more often than it had before.";
  }

  if (topShift && topShift.delta < 0) {
    return "By the end of the month, some of that early momentum had faded.";
  }

  return "By the end of the month, the pattern from earlier in the month had mostly held steady.";
}

function whyThisChangedFor(month: MonthlyIdentityEvolution): string {
  return month.majorDecisions.length > 0
    ? "Repeated decisions made in similar circumstances reinforced the same response each time, rather than any single moment causing the shift."
    : "A few small, similar choices added up over the month, rather than any single event causing the shift.";
}

export function generateMockMonthlyIdentityNarratives(
  months: MonthlyIdentityEvolution[],
): MockMonthlyIdentityNarrativeDraft[] {
  return months.map((month) => ({
    month: month.month,
    headline: headlineFor(month.dominantThemes),
    opening_beginning: openingBeginningFor(month),
    opening_end: openingEndFor(month),
    why_this_changed: whyThisChangedFor(month),
  }));
}
