import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { monthlyIdentityNarrativeDiscoverOutputSchema } from "@/lib/ai/schemas/monthly-identity-narrative";
import {
  loadMonthlyIdentityEvolution,
  type MonthlyFutureShift,
} from "@/lib/monthly-identity-evolution";
import { createClient } from "@/lib/supabase/server";

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

export type MonthlyIdentityNarrative = {
  month: string;
  title: string;
  summary: string;
  themes: string[];
  majorDecisions: string[];
  futureShifts: MonthlyFutureShift[];
  identityChanges: string[];
};

/**
 * Turns each month's deterministic MonthlyIdentityEvolution into a readable
 * narrative chapter. Only title, summary, and identityChanges are
 * AI-generated — themes, majorDecisions, and futureShifts are carried
 * through unchanged from the aggregation layer, never re-derived or
 * rewritten by the model.
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

  const narratives: MonthlyIdentityNarrative[] = months.map((month) => {
    const draft = draftByMonth.get(month.month);

    return {
      month: month.month,
      title: draft?.title ?? month.month,
      summary: draft?.summary ?? "",
      themes: month.dominantThemes,
      majorDecisions: month.majorDecisions,
      futureShifts: month.futureShifts,
      identityChanges: draft?.identity_changes ?? [],
    };
  });

  return { narratives };
}
