import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { futureSelfDiscoverOutputSchema } from "@/lib/ai/schemas/future-self";
import { isPositiveThemeName } from "@/lib/check-in-themes";
import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import type {
  FutureSelfMovementDirection,
  MockFutureSelfDraft,
} from "@/lib/mock-future-self-generator";
import { createClient } from "@/lib/supabase/server";
import type { ThemeChange, FutureSelf } from "@/types/database";
import type { IdentityUpdateType, ThemeName } from "@/types/enums";

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

export async function listFutureSelves(options?: {
  status?: FutureSelf["status"];
  limit?: number;
}): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  let query = supabase
    .from("future_selves")
    .select("*")
    .eq("user_id", auth.userId)
    .order("percentage", { ascending: false })
    .order("updated_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { futureSelves: data };
}

export async function listActiveFutureSelves(
  limit = 4,
): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  return listFutureSelves({ status: "active", limit });
}

type ChosenPathEvidence = { themes: ThemeName[]; chosen_at: string | null };
type CheckInEvidence = { theme_changes: ThemeChange[]; created_at: string };
type IdentityUpdateEvidence = {
  themes: ThemeName[];
  update_type: IdentityUpdateType;
  created_at: string;
};

type EvidenceBundle = {
  momentCount: number;
  chosenPaths: ChosenPathEvidence[];
  checkIns: CheckInEvidence[];
  identityUpdates: IdentityUpdateEvidence[];
};

type GenerationInput = EvidenceBundle | { error: string };

async function loadGenerationInput(userId: string): Promise<GenerationInput> {
  const supabase = await createClient();

  const [
    { count: momentCount, error: momentError },
    { data: chosenPaths, error: pathsError },
    { data: checkIns, error: checkInsError },
    { data: identityUpdates, error: updatesError },
  ] = await Promise.all([
    supabase
      .from("moments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("paths")
      .select("themes, chosen_at")
      .eq("user_id", userId)
      .eq("is_chosen", true),
    supabase.from("check_ins").select("theme_changes, created_at").eq("user_id", userId),
    supabase
      .from("identity_updates")
      .select("themes, update_type, created_at")
      .eq("user_id", userId),
  ]);

  if (momentError || pathsError || checkInsError || updatesError) {
    return {
      error:
        momentError?.message ??
        pathsError?.message ??
        checkInsError?.message ??
        updatesError?.message ??
        "Failed to load history.",
    };
  }

  return {
    momentCount: momentCount ?? 0,
    chosenPaths: chosenPaths ?? [],
    checkIns: checkIns ?? [],
    identityUpdates: identityUpdates ?? [],
  };
}

// Deterministic point values per evidence tier — the model only decides
// movement_direction; code decides how far that direction moves the number.
const MOVEMENT_POINTS: Record<"reality_shift" | "pattern_strengthened" | "theme_emerging", number> = {
  reality_shift: 8,
  pattern_strengthened: 5,
  theme_emerging: 3,
};
const MINOR_EVIDENCE_POINTS = 1;

function directionSign(direction: FutureSelfMovementDirection): -1 | 0 | 1 {
  if (direction === "positive") return 1;
  if (direction === "negative") return -1;
  return 0;
}

function sharesTheme(a: readonly ThemeName[], b: readonly ThemeName[]): boolean {
  const set = new Set(b);
  return a.some((theme) => set.has(theme));
}

const SUMMARY_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "to", "of", "in", "on", "at", "for",
  "with", "that", "this", "these", "those", "is", "are", "was", "were", "be",
  "been", "being", "as", "it", "its", "their", "your", "you", "may", "than",
  "rather", "across", "from", "without", "not", "no", "more", "most", "when",
  "what", "which", "while", "over", "out", "up", "down", "into", "about",
]);

function tokenizeSummary(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !SUMMARY_STOPWORDS.has(word)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function countThemeOverlap(a: readonly ThemeName[], b: readonly ThemeName[]): number {
  const set = new Set(b);
  return a.filter((theme) => set.has(theme)).length;
}

/**
 * Matches generated drafts to existing future_selves rows so identity and
 * percentage baselines survive the model renaming a trajectory between
 * generations. Exact name match is the fast path. Otherwise, theme overlap
 * >= 2 is the only gate (summary similarity is a tiebreaker, never an
 * independent gate — it's too noisy on AI-written prose to trust alone), and
 * assignment is global one-to-one: every candidate pair is scored, sorted by
 * (overlap, similarity) descending, and greedily claimed so one existing row
 * can never be claimed by two drafts.
 */
function matchDraftsToExisting(
  drafts: MockFutureSelfDraft[],
  existingRows: FutureSelf[],
): Map<number, FutureSelf> {
  const matches = new Map<number, FutureSelf>();
  const claimedExistingIds = new Set<string>();
  const unmatchedDraftIndices: number[] = [];

  drafts.forEach((draft, index) => {
    const exact = existingRows.find(
      (row) => row.name === draft.name && !claimedExistingIds.has(row.id),
    );
    if (exact) {
      matches.set(index, exact);
      claimedExistingIds.add(exact.id);
    } else {
      unmatchedDraftIndices.push(index);
    }
  });

  const remainingExisting = existingRows.filter((row) => !claimedExistingIds.has(row.id));

  const candidates: {
    draftIndex: number;
    existing: FutureSelf;
    themeOverlap: number;
    summarySimilarity: number;
  }[] = [];

  for (const draftIndex of unmatchedDraftIndices) {
    const draft = drafts[draftIndex];
    const draftTokens = tokenizeSummary(draft.summary);

    for (const existing of remainingExisting) {
      const themeOverlap = countThemeOverlap(draft.themes, existing.themes);
      if (themeOverlap < 2) continue;

      candidates.push({
        draftIndex,
        existing,
        themeOverlap,
        summarySimilarity: jaccardSimilarity(draftTokens, tokenizeSummary(existing.summary)),
      });
    }
  }

  candidates.sort(
    (a, b) => b.themeOverlap - a.themeOverlap || b.summarySimilarity - a.summarySimilarity,
  );

  const claimedDraftIndices = new Set<number>();

  for (const candidate of candidates) {
    if (
      claimedDraftIndices.has(candidate.draftIndex) ||
      claimedExistingIds.has(candidate.existing.id)
    ) {
      continue;
    }

    matches.set(candidate.draftIndex, candidate.existing);
    claimedDraftIndices.add(candidate.draftIndex);
    claimedExistingIds.add(candidate.existing.id);
  }

  return matches;
}

/**
 * Looks only at evidence created since the cutoff (the last generation run,
 * or unbounded for a future self that doesn't exist yet) and whose themes
 * overlap this future self's themes. No matching evidence at all means no
 * movement — direction alone never moves the percentage.
 */
function resolveEvidenceMagnitude(
  futureThemes: ThemeName[],
  evidence: EvidenceBundle,
  since: string | null,
): number {
  const isRecent = (createdAt: string) => !since || createdAt > since;

  const matchingUpdates = evidence.identityUpdates.filter(
    (update) => isRecent(update.created_at) && sharesTheme(futureThemes, update.themes),
  );

  if (matchingUpdates.some((update) => update.update_type === "reality_shift")) {
    return MOVEMENT_POINTS.reality_shift;
  }

  if (matchingUpdates.some((update) => update.update_type === "pattern_strengthened")) {
    return MOVEMENT_POINTS.pattern_strengthened;
  }

  const matchingCheckIns = evidence.checkIns.filter((checkIn) => {
    if (!isRecent(checkIn.created_at)) {
      return false;
    }
    const positiveThemes = checkIn.theme_changes
      .map((change) => change.theme)
      .filter(isPositiveThemeName);
    return sharesTheme(futureThemes, positiveThemes);
  });

  if (
    matchingUpdates.some((update) => update.update_type === "theme_emerging") ||
    matchingCheckIns.length >= 2
  ) {
    return MOVEMENT_POINTS.theme_emerging;
  }

  const matchingPaths = evidence.chosenPaths.filter(
    (path) => isRecent(path.chosen_at ?? "") && sharesTheme(futureThemes, path.themes),
  );

  if (matchingCheckIns.length >= 1 || matchingPaths.length >= 1) {
    return MINOR_EVIDENCE_POINTS;
  }

  return 0;
}

/** Proportionally rescales raw percentages to sum to 100, preserving ordering and relative differences. */
function normalizeToHundred(rawValues: number[]): number[] {
  const total = rawValues.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return rawValues.map(() => 0);
  }

  const scaled = rawValues.map((value) => Math.max(1, Math.round((value / total) * 100)));
  const drift = 100 - scaled.reduce((sum, value) => sum + value, 0);
  const largestIndex = scaled.reduce(
    (best, value, index) => (value > scaled[best] ? index : best),
    0,
  );
  scaled[largestIndex] += drift;

  return scaled;
}

async function recordFutureSelfEvent(input: {
  userId: string;
  futureSelfId: string;
  eventType: "emerged" | "grew" | "faded" | "returned";
  percentageBefore: number | null;
  percentageAfter: number;
  summary: string;
}) {
  const supabase = await createClient();

  await supabase.from("future_self_events").insert({
    user_id: input.userId,
    future_self_id: input.futureSelfId,
    event_type: input.eventType,
    percentage_before: input.percentageBefore,
    percentage_after: input.percentageAfter,
    summary: input.summary,
  });
}

export async function generateFutureSelves(): Promise<
  { futureSelves: FutureSelf[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const input = await loadGenerationInput(auth.userId);
  if ("error" in input) {
    return input;
  }

  let drafts: MockFutureSelfDraft[];

  if (input.momentCount < 1) {
    drafts = [];
  } else {
    const generationResult = await runStructuredGeneration({
      userId: auth.userId,
      profile: "future_self",
      promptId: "future_self.discover",
      schema: futureSelfDiscoverOutputSchema,
    });

    if (!generationResult.ok) {
      return { error: generationResult.error };
    }

    drafts = generationResult.data;

    // An empty array here means the model produced no usable trajectories —
    // possibly a real "nothing changed" judgment, but indistinguishable from
    // a context/generation problem. Either way, silently fading every active
    // future on a zero-draft response is too destructive: treat it as a
    // failed generation and leave existing futures untouched.
    if (drafts.length === 0) {
      return {
        error:
          "Future Self generation returned no results. Existing active futures were left unchanged.",
      };
    }
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabase
    .from("future_selves")
    .select("*")
    .eq("user_id", auth.userId);

  if (existingError) {
    return { error: existingError.message };
  }

  const draftMatches = matchDraftsToExisting(drafts, existingRows ?? []);
  const matchedExistingIds = new Set(
    [...draftMatches.values()].map((existing) => existing.id),
  );

  const lastGeneratedAt = (existingRows ?? []).reduce<string | null>(
    (max, row) => (!max || row.updated_at > max ? row.updated_at : max),
    null,
  );

  // Compute every draft's deterministic percentage before writing anything —
  // normalization needs the full set of this run's values up front.
  const computed = drafts.map((draft, index) => {
    const existing = draftMatches.get(index);
    // Bound evidence to "since the last generation run" for every draft, not
    // just ones that matched an existing name. Unbounded (null) lookback only
    // makes sense when there has never been a prior run at all — otherwise a
    // long-lived user's entire history almost always contains a reality_shift
    // for any theme, which saturates every unmatched draft to the same max
    // magnitude and collapses normalization into an even split.
    const since = lastGeneratedAt;
    const baseline = existing?.percentage ?? 0;
    const magnitude = resolveEvidenceMagnitude(draft.themes, input, since);
    const delta = directionSign(draft.movement_direction) * magnitude;
    const raw = Math.min(100, Math.max(0, baseline + delta));

    return { draft, existing, raw };
  });

  const normalizedPercentages = normalizeToHundred(computed.map((entry) => entry.raw));

  // Only an evidence_strength/status transition marks Current Self stale — a
  // percentage tick alone (no strength change) is too noisy a signal on its own.
  let hasMeaningfulTransition = false;

  for (const [index, { draft, existing }] of computed.entries()) {
    const percentage = normalizedPercentages[index];

    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from("future_selves")
        .insert({
          user_id: auth.userId,
          name: draft.name,
          summary: draft.summary,
          percentage,
          evidence_strength: draft.evidence_strength,
          benefits: draft.benefits,
          consequences: draft.consequences,
          prediction: draft.prediction,
          themes: draft.themes,
          why_changed: draft.why_changed,
          status: "active",
        })
        .select("*")
        .single();

      if (insertError || !created) {
        return { error: insertError?.message ?? "Failed to create future self." };
      }

      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: created.id,
        eventType: "emerged",
        percentageBefore: null,
        percentageAfter: percentage,
        summary: `${draft.name} may be emerging from your patterns.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    if (existing.status === "faded") {
      const { error: updateError } = await supabase
        .from("future_selves")
        .update({
          summary: draft.summary,
          percentage,
          previous_percentage: existing.percentage,
          evidence_strength: draft.evidence_strength,
          benefits: draft.benefits,
          consequences: draft.consequences,
          prediction: draft.prediction,
          themes: draft.themes,
          why_changed: draft.why_changed,
          status: "active",
          updated_at: now,
        })
        .eq("id", existing.id)
        .eq("user_id", auth.userId);

      if (updateError) {
        return { error: updateError.message };
      }

      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: existing.id,
        eventType: "returned",
        percentageBefore: existing.percentage,
        percentageAfter: percentage,
        summary: `${draft.name} may be returning as your patterns shift.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    const percentageIncreased = percentage > existing.percentage;
    const evidenceStrengthChanged = draft.evidence_strength !== existing.evidence_strength;

    // Always snapshot previous_percentage, even when nothing else changed —
    // trend tracking compares against "as of last generation," not "as of
    // last change," so every active match must be touched every run.
    const { error: updateError } = await supabase
      .from("future_selves")
      .update({
        summary: draft.summary,
        percentage,
        previous_percentage: existing.percentage,
        evidence_strength: draft.evidence_strength,
        benefits: draft.benefits,
        consequences: draft.consequences,
        prediction: draft.prediction,
        themes: draft.themes,
        why_changed: draft.why_changed,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId);

    if (updateError) {
      return { error: updateError.message };
    }

    if (percentageIncreased) {
      await recordFutureSelfEvent({
        userId: auth.userId,
        futureSelfId: existing.id,
        eventType: "grew",
        percentageBefore: existing.percentage,
        percentageAfter: percentage,
        summary: `${draft.name} may be gaining strength.`,
      });
    }

    if (evidenceStrengthChanged) {
      hasMeaningfulTransition = true;
    }
  }

  for (const existing of existingRows ?? []) {
    if (existing.status !== "active" || matchedExistingIds.has(existing.id)) {
      continue;
    }

    const { error: fadeError } = await supabase
      .from("future_selves")
      .update({
        status: "faded",
        percentage: 0,
        previous_percentage: existing.percentage,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId);

    if (fadeError) {
      return { error: fadeError.message };
    }

    await recordFutureSelfEvent({
      userId: auth.userId,
      futureSelfId: existing.id,
      eventType: "faded",
      percentageBefore: existing.percentage,
      percentageAfter: 0,
      summary: `${existing.name} may be fading for now.`,
    });

    hasMeaningfulTransition = true;
  }

  if (hasMeaningfulTransition) {
    await requestCurrentSelfRegeneration(auth.userId);
  }

  return listFutureSelves({ status: "active" });
}
