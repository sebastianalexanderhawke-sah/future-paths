import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { monthlyIdentityNarrativeDiscoverOutputSchema } from "@/lib/ai/schemas/monthly-identity-narrative";
import {
  computeMonthlyComparison,
  type MonthlyComparison,
} from "@/lib/monthly-identity-comparison";
import { loadMonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";
import { createClient } from "@/lib/supabase/server";
import type { ThemeName } from "@/types/enums";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated." };
  }

  return { userId: user.id };
}

const MAX_HOW_YOU_CHANGED_ITEMS = 5;

export type MonthlyIdentityNarrative = {
  month: string;
  headline: string;
  openingBeginning: string;
  openingEnd: string;
  howYouChanged: string[];
  whyThisChanged: string;
  previousMonth: string | null;
  comparison: MonthlyComparison;
};

// Short disposition phrases per theme, used to turn a bare trait-presence
// signal ("Courage" became more present) into a movement statement ("You
// became more willing to act without certainty") without inventing the
// underlying claim — the direction (more/less) always comes from
// computeMonthlyComparison, which for the earliest month on record compares
// against no prior evidence at all, so every trait it surfaces is "more
// present" — a baseline reading of "who you became" rather than a
// fabricated change.
const TRAIT_PHRASE_BY_THEME: Record<ThemeName, string> = {
  Connection: "invested in relationships",
  Independence: "comfortable making decisions alone",
  Curiosity: "open to exploring new options",
  Stability: "focused on stability over preference",
  Creativity: "willing to make something new",
  Growth: "willing to step into the unknown",
  Belonging: "invested in feeling like you belong",
  Leadership: "willing to carry responsibility",
  Reflection: "inclined to examine your own patterns",
  Courage: "willing to act without certainty",
};

function traitPhrase(theme: string): string {
  return TRAIT_PHRASE_BY_THEME[theme as ThemeName] ?? theme.toLowerCase();
}

/**
 * Builds "You became more/less ..." statements straight from the
 * deterministic trait comparison — no AI involved. For the earliest month on
 * record this still produces statements (the month's strongest identity
 * evidence, read as a baseline), since computeMonthlyComparison already
 * treats "no previous month" as "nothing to compare against" rather than
 * "nothing to say." Capped at 5 total, "more" first, so the list never
 * exceeds what a person could read in a few seconds.
 */
function howYouChangedFor(comparison: MonthlyComparison): string[] {
  return [
    ...comparison.traitsMorePresent.map((theme) => `You became more ${traitPhrase(theme)}.`),
    ...comparison.traitsLessPresent.map((theme) => `You became less ${traitPhrase(theme)}.`),
  ].slice(0, MAX_HOW_YOU_CHANGED_ITEMS);
}

/**
 * Turns each month's deterministic MonthlyIdentityEvolution into a chapter
 * about change, not a report of events. The AI only writes the headline,
 * the two opening paragraphs, and the "why this changed" synthesis — all
 * grounded in that month's evidence (chosen paths, identity updates,
 * check-ins, future-self movement) and explicitly forbidden from listing it.
 * "How you changed" is deterministic, carried through from the comparison
 * layer, never re-derived or invented by the model.
 */
export async function loadMonthlyIdentityNarratives(): Promise<
  { narratives: MonthlyIdentityNarrative[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const evolutionResult = await loadMonthlyIdentityEvolution();
  if ("error" in evolutionResult) {
    return evolutionResult;
  }

  const months = evolutionResult.months;
  if (months.length === 0) {
    return { narratives: [] };
  }

  const generationResult = await runStructuredGeneration({
    userId: auth.userId,
    profile: "monthly_identity_narrative",
    promptId: "monthly_identity_narrative.generate",
    schema: monthlyIdentityNarrativeDiscoverOutputSchema,
  });

  if (!generationResult.ok) {
    return { error: generationResult.error };
  }

  const draftByMonth = new Map(generationResult.data.map((draft) => [draft.month, draft]));

  // months is sorted newest-first, so the chronologically previous month for
  // entry i is months[i + 1] — the oldest entry (last in the array) has none.
  const narratives: MonthlyIdentityNarrative[] = months.map((month, index) => {
    const draft = draftByMonth.get(month.month);
    const previousMonth = months[index + 1];
    const comparison = computeMonthlyComparison(month, previousMonth ?? null);

    return {
      month: month.month,
      headline: draft?.headline ?? month.month,
      openingBeginning: draft?.opening_beginning ?? "",
      openingEnd: draft?.opening_end ?? "",
      howYouChanged: howYouChangedFor(comparison),
      whyThisChanged: draft?.why_this_changed ?? "",
      previousMonth: previousMonth?.month ?? null,
      comparison,
    };
  });

  return { narratives };
}
