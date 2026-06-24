import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";

export type MockMonthlyIdentityNarrativeDraft = {
  month: string;
  title: string;
  summary: string;
  identity_changes: string[];
};

// Chapter-style title fragments keyed by dominant theme — picked by the
// month's strongest theme so titles vary with the actual evidence instead
// of all reading the same, while staying deterministic (no randomness).
const TITLE_BY_THEME: Record<string, string> = {
  Courage: "Acting Before Certainty",
  Independence: "Standing On Your Own",
  Stability: "Choosing Stability Under Pressure",
  Connection: "Rebuilding Connection",
  Growth: "Stepping Into The Unknown",
  Belonging: "Finding Where You Belong",
  Curiosity: "Following What Pulls You",
  Leadership: "Stepping Into Responsibility",
  Reflection: "Sitting With What Changed",
  Creativity: "Making Something New",
};

const FALLBACK_TITLE = "A Month Of Change";

const FALLBACK_IDENTITY_CHANGES = [
  "More willing to act without full certainty",
  "Less reliant on ideal conditions before starting",
  "More comfortable making decisions alone",
  "More focused on what's necessary over what's preferred",
  "More attentive to long-term consequences over short-term comfort",
];

function titleFor(dominantThemes: string[]): string {
  for (const theme of dominantThemes) {
    const title = TITLE_BY_THEME[theme];
    if (title) return title;
  }

  return FALLBACK_TITLE;
}

function summaryFor(month: MonthlyIdentityEvolution): string {
  const leadTheme = month.dominantThemes[0];
  const decisionCount = month.majorDecisions.length;
  const topShift = month.futureShifts[0];

  const sentences: string[] = [];

  sentences.push(
    leadTheme
      ? `${leadTheme} ran through ${decisionCount > 1 ? "several decisions" : "this period"} rather than staying in the background.`
      : "A consistent pattern ran through this period rather than staying in the background.",
  );

  if (topShift) {
    sentences.push(
      `${topShift.delta > 0 ? "Momentum built toward" : "Momentum pulled away from"} ${topShift.futureName}, suggesting the shift is more than a one-off.`,
    );
  }

  sentences.push(
    "This reads less like a single choice and more like a change in what felt possible.",
  );

  return sentences.join(" ");
}

function identityChangesFor(month: MonthlyIdentityEvolution): string[] {
  const fromUpdates = [
    ...new Set(month.identityChangeEvidence.identityUpdates.map((update) => update.title)),
  ];

  if (fromUpdates.length >= 3) {
    return fromUpdates.slice(0, 5);
  }

  const padded = [...fromUpdates];
  for (const filler of FALLBACK_IDENTITY_CHANGES) {
    if (padded.length >= 3) break;
    if (!padded.includes(filler)) padded.push(filler);
  }

  return padded.slice(0, 5);
}

export function generateMockMonthlyIdentityNarratives(
  months: MonthlyIdentityEvolution[],
): MockMonthlyIdentityNarrativeDraft[] {
  return months.map((month) => ({
    month: month.month,
    title: titleFor(month.dominantThemes),
    summary: summaryFor(month),
    identity_changes: identityChangesFor(month),
  }));
}
