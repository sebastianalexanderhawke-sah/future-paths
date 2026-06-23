import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { futureSelfDiscoverOutputSchema } from "@/lib/ai/schemas/future-self";
import { isPositiveThemeName } from "@/lib/check-in-themes";
import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
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

// Deterministic point values per evidence type — relative ordering matters
// more than the exact numbers: a reality_shift should outweigh several
// check-ins, but several check-ins should still outweigh one theme_emerging.
const EVIDENCE_WEIGHTS = {
  reality_shift: 8,
  pattern_strengthened: 5,
  theme_emerging: 3,
  chosen_path: 2,
  check_in: 1,
} as const;

// A flat chosen_path weight can't make a single new choice visible: a future
// accumulates one chosen_path contribution per past path that shares its
// theme, and themes repeat constantly, so a mature future can easily be
// carrying 30-50 historical chosen-path contributions already. Scaling
// EVIDENCE_WEIGHTS.chosen_path itself doesn't fix this — it scales that
// entire historical sum by the same factor as the new contribution, so the
// new path's *share* of the total barely moves even at 10x. Instead, only
// the single most-recently-chosen path (by chosen_at, across all of the
// user's paths) gets this higher weight; every older chosen_path keeps the
// base weight above. The newest deliberate choice is meant to read as the
// strongest signal in the system — stronger than a passively-observed
// reality_shift — so picking a new path is guaranteed to be visible on the
// next generation regardless of how much history already exists.
const MOST_RECENT_CHOSEN_PATH_WEIGHT = 20;

// Recency decay: a contribution's weight shrinks with age but never reaches
// zero, so a trajectory built over months doesn't evaporate the moment
// nothing new happens for a week.
const EVIDENCE_DECAY_TIERS: { underDays: number; multiplier: number }[] = [
  { underDays: 7, multiplier: 1 },
  { underDays: 30, multiplier: 0.75 },
  { underDays: 90, multiplier: 0.5 },
];
const EVIDENCE_DECAY_FLOOR = 0.25;

function evidenceDecay(ageDays: number): number {
  for (const tier of EVIDENCE_DECAY_TIERS) {
    if (ageDays < tier.underDays) return tier.multiplier;
  }
  return EVIDENCE_DECAY_FLOOR;
}

function evidenceAgeDays(createdAt: string, now: string): number {
  return (new Date(now).getTime() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000);
}

function sharesTheme(a: readonly ThemeName[], b: readonly ThemeName[]): boolean {
  const set = new Set(b);
  return a.some((theme) => set.has(theme));
}

/** Most recent chosen_at across all of the user's chosen paths, or null if none have one. */
function mostRecentChosenAt(chosenPaths: readonly ChosenPathEvidence[]): string | null {
  let latest: string | null = null;
  for (const path of chosenPaths) {
    if (path.chosen_at && (!latest || path.chosen_at > latest)) {
      latest = path.chosen_at;
    }
  }
  return latest;
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
 * Cumulative, recency-weighted trajectory strength — every matching piece of
 * evidence contributes (not just the single strongest type), each discounted
 * by age but never to zero. Used directly as the pre-normalization raw score
 * rather than as a +/- delta on top of the previous percentage: an additive
 * delta on a fixed 0-100 scale can't represent open-ended cumulative history
 * without either going stale (bounded to "since last generation," which is
 * frequently empty) or saturating the clamp ceiling (unbounded lookback) —
 * the two failure modes this replaces. normalizeToHundred rescales the
 * result, so its absolute magnitude doesn't matter, only its size relative
 * to the other drafts in the same run.
 */
function computeTrajectoryStrength(
  futureThemes: ThemeName[],
  evidence: EvidenceBundle,
  now: string,
): number {
  let strength = 0;

  for (const update of evidence.identityUpdates) {
    if (!sharesTheme(futureThemes, update.themes)) continue;
    strength +=
      EVIDENCE_WEIGHTS[update.update_type] * evidenceDecay(evidenceAgeDays(update.created_at, now));
  }

  for (const checkIn of evidence.checkIns) {
    const positiveThemes = checkIn.theme_changes
      .map((change) => change.theme)
      .filter(isPositiveThemeName);
    if (!sharesTheme(futureThemes, positiveThemes)) continue;
    strength += EVIDENCE_WEIGHTS.check_in * evidenceDecay(evidenceAgeDays(checkIn.created_at, now));
  }

  const latestChosenAt = mostRecentChosenAt(evidence.chosenPaths);

  for (const path of evidence.chosenPaths) {
    if (!sharesTheme(futureThemes, path.themes)) continue;
    const age = path.chosen_at ? evidenceAgeDays(path.chosen_at, now) : Infinity;
    const isMostRecentChoice = path.chosen_at !== null && path.chosen_at === latestChosenAt;
    const weight = isMostRecentChoice ? MOST_RECENT_CHOSEN_PATH_WEIGHT : EVIDENCE_WEIGHTS.chosen_path;
    strength += weight * evidenceDecay(age);
  }

  return strength;
}

// Within-batch duplicate detection: theme overlap is the gate (mirrors
// matchDraftsToExisting's gate), and name/summary similarity confirms it.
// Jaccard, not raw overlap count, because draft theme lists are short
// (1-3 entries) — a shared count of 2 means very different things for a
// 2-theme vs. a 5-theme list.
const DUPLICATE_THEME_JACCARD_THRESHOLD = 0.6;
const DUPLICATE_NAME_OR_SUMMARY_JACCARD_THRESHOLD = 0.5;

function isNearDuplicateTrajectory(a: MockFutureSelfDraft, b: MockFutureSelfDraft): boolean {
  const themeSimilarity = jaccardSimilarity(new Set<string>(a.themes), new Set<string>(b.themes));
  if (themeSimilarity < DUPLICATE_THEME_JACCARD_THRESHOLD) {
    return false;
  }

  const nameSimilarity = jaccardSimilarity(tokenizeSummary(a.name), tokenizeSummary(b.name));
  const summarySimilarity = jaccardSimilarity(tokenizeSummary(a.summary), tokenizeSummary(b.summary));

  return (
    nameSimilarity >= DUPLICATE_NAME_OR_SUMMARY_JACCARD_THRESHOLD ||
    summarySimilarity >= DUPLICATE_NAME_OR_SUMMARY_JACCARD_THRESHOLD
  );
}

/**
 * Drops near-duplicate drafts within a single generation batch, keeping
 * whichever twin has the stronger trajectory score. Pairwise and greedy by
 * draft order: once a draft is dropped it's out for every later comparison,
 * so the survivor of a duplicate cluster is always the one with the highest
 * trajectory strength in that cluster, regardless of comparison order.
 */
function dedupeDrafts(
  drafts: MockFutureSelfDraft[],
  evidence: EvidenceBundle,
  now: string,
): MockFutureSelfDraft[] {
  const rawStrength = drafts.map((draft) =>
    Math.max(0, computeTrajectoryStrength(draft.themes, evidence, now)),
  );
  const dropped = drafts.map(() => false);

  for (let i = 0; i < drafts.length; i++) {
    if (dropped[i]) continue;

    for (let j = i + 1; j < drafts.length; j++) {
      if (dropped[j] || !isNearDuplicateTrajectory(drafts[i], drafts[j])) continue;

      if (rawStrength[i] >= rawStrength[j]) {
        dropped[j] = true;
      } else {
        dropped[i] = true;
        break;
      }
    }
  }

  return drafts.filter((_, index) => !dropped[index]);
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

  const now = new Date().toISOString();
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

    // Enforce trajectory distinctness in code rather than relying solely on
    // the prompt's "only generate distinct trajectories" instruction.
    drafts = dedupeDrafts(drafts, input, now);
  }

  const supabase = await createClient();

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

  // Compute every draft's deterministic percentage before writing anything —
  // normalization needs the full set of this run's values up front.
  const computed = drafts.map((draft, index) => {
    const existing = draftMatches.get(index);
    const raw = Math.max(0, computeTrajectoryStrength(draft.themes, input, now));

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
