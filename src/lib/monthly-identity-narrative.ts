import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { monthlyIdentityNarrativeDiscoverOutputSchema } from "@/lib/ai/schemas/monthly-identity-narrative";
import {
  computeMonthlyComparison,
  type MonthlyComparison,
} from "@/lib/monthly-identity-comparison";
import {
  currentMonthLabel,
  loadMonthlyIdentityEvolution,
  type MonthlyIdentityEvolution,
} from "@/lib/monthly-identity-evolution";
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
  previousMonth: string | null;
  comparison: MonthlyComparison;
  situationCount: number;
  checkInCount: number;
  reflectionCount: number;
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

// The AI-authored slice of a narrative, as stored per (user, month).
type NarrativeDraft = {
  month: string;
  headline: string;
  opening_beginning: string;
  opening_end: string;
};

type StoredNarrativeRow = NarrativeDraft & { evidence_fingerprint: string };

/**
 * Deterministic summary of the evidence a month's narrative is grounded in.
 * Any new or changed evidence in the month — another chosen path, check-in,
 * identity update, answered reflection, theme or future-shift movement —
 * changes the fingerprint. Used only to decide whether the *current* month's
 * stored narrative is stale; historical months never regenerate.
 */
function evidenceFingerprint(month: MonthlyIdentityEvolution): string {
  const evidence = month.identityChangeEvidence;
  const latest = (dates: string[]): string =>
    dates.length === 0 ? "" : dates.reduce((a, b) => (a > b ? a : b));

  return [
    `u${evidence.identityUpdates.length}@${latest(evidence.identityUpdates.map((e) => e.createdAt))}`,
    `p${evidence.chosenPaths.length}@${latest(evidence.chosenPaths.map((e) => e.chosenAt))}`,
    `c${evidence.checkIns.length}@${latest(evidence.checkIns.map((e) => e.createdAt))}`,
    `r${evidence.checkIns.filter((c) => c.reflectionAnswer !== null).length}`,
    `t${month.dominantThemes.join(",")}`,
    `f${month.futureShifts.map((s) => `${s.futureName}=${s.delta}`).join("|")}`,
  ].join(";");
}

/**
 * Turns each month's deterministic MonthlyIdentityEvolution into a chapter
 * about change, not a report of events. The AI writes the headline and the
 * two narrative paragraphs — grounded in that month's evidence and forbidden
 * from listing it. "How you changed" is deterministic. Evidence counts are
 * computed directly from the evolution data, never estimated.
 *
 * Narrative drafts are persisted per (user, month): a settled historical
 * month's chapter is written once and never regenerated; the current month
 * regenerates only when its evidence fingerprint changes. A load where every
 * month is already stored and unchanged makes no AI call at all. Generation
 * itself (prompt, context, parsing) is unchanged — only when it runs.
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

  const supabase = await createClient();
  const { data: storedRows, error: storedError } = await supabase
    .from("monthly_identity_narratives")
    .select("month, headline, opening_beginning, opening_end, evidence_fingerprint")
    .eq("user_id", auth.userId);

  // A failed read falls back to generating (the pre-persistence behavior)
  // rather than failing the page.
  const storedByMonth = new Map<string, StoredNarrativeRow>(
    storedError ? [] : ((storedRows ?? []) as StoredNarrativeRow[]).map((row) => [row.month, row]),
  );

  const nowLabel = currentMonthLabel();
  const fingerprintByMonth = new Map(
    months.map((month) => [month.month, evidenceFingerprint(month)]),
  );

  // A month needs generation when it has never been stored, or when it is the
  // still-changing current month and its evidence moved since the stored
  // draft was written. Settled historical months never regenerate.
  const isStale = (month: MonthlyIdentityEvolution): boolean => {
    const stored = storedByMonth.get(month.month);
    if (!stored) return true;
    return (
      month.month === nowLabel &&
      stored.evidence_fingerprint !== fingerprintByMonth.get(month.month)
    );
  };

  const draftByMonth = new Map<string, NarrativeDraft>(storedByMonth);

  if (months.some(isStale)) {
    const generationResult = await runStructuredGeneration({
      userId: auth.userId,
      profile: "monthly_identity_narrative",
      promptId: "monthly_identity_narrative.generate",
      schema: monthlyIdentityNarrativeDiscoverOutputSchema,
    });

    if (!generationResult.ok) {
      return { error: generationResult.error };
    }

    const generatedByMonth = new Map(
      generationResult.data.map((draft) => [draft.month, draft]),
    );

    // Persist only the stale months' fresh drafts. Stored historical
    // narratives keep their original text even though the generation run
    // produced new drafts for them — past chapters stay stable. A month the
    // model omitted stores nothing (same fallback rendering as before) and
    // is retried on the next load.
    const rowsToPersist = months.flatMap((month) => {
      if (!isStale(month)) return [];
      const draft = generatedByMonth.get(month.month);
      if (!draft) return [];
      return [
        {
          user_id: auth.userId,
          month: month.month,
          headline: draft.headline,
          opening_beginning: draft.opening_beginning,
          opening_end: draft.opening_end,
          evidence_fingerprint: fingerprintByMonth.get(month.month)!,
          updated_at: new Date().toISOString(),
        },
      ];
    });

    for (const row of rowsToPersist) {
      draftByMonth.set(row.month, row);
    }

    if (rowsToPersist.length > 0) {
      // Best-effort: a failed write only means the next load generates again.
      const { error: upsertError } = await supabase
        .from("monthly_identity_narratives")
        .upsert(rowsToPersist, { onConflict: "user_id,month" });

      if (upsertError) {
        console.error(
          "[loadMonthlyIdentityNarratives] Failed to persist narratives:",
          upsertError.message,
        );
      }
    }
  }

  // months is sorted newest-first, so the chronologically previous month for
  // entry i is months[i + 1] — the oldest entry (last in the array) has none.
  const narratives: MonthlyIdentityNarrative[] = months.map((month, index) => {
    const draft = draftByMonth.get(month.month);
    const previousMonth = months[index + 1];
    const comparison = computeMonthlyComparison(month, previousMonth ?? null);

    const checkIns = month.identityChangeEvidence.checkIns;

    return {
      month: month.month,
      headline: draft?.headline ?? month.month,
      openingBeginning: draft?.opening_beginning ?? "",
      openingEnd: draft?.opening_end ?? "",
      howYouChanged: howYouChangedFor(comparison),
      previousMonth: previousMonth?.month ?? null,
      comparison,
      situationCount: month.identityChangeEvidence.chosenPaths.length,
      checkInCount: checkIns.length,
      reflectionCount: checkIns.filter((c) => c.reflectionAnswer !== null).length,
    };
  });

  return { narratives };
}
