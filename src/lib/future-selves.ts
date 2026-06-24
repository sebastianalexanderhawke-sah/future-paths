import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import { futureSelfDiscoverOutputSchema } from "@/lib/ai/schemas/future-self";
import { isPositiveThemeName } from "@/lib/check-in-themes";
import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import type { MockFutureSelfDraft } from "@/lib/mock-future-self-generator";
import { createClient } from "@/lib/supabase/server";
import type { ThemeChange, FutureSelf, FutureSelfEvent } from "@/types/database";
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

export type FutureSelfImpactEntry = {
  futureSelfId: string;
  name: string;
  eventType: FutureSelfEvent["event_type"];
  percentageBefore: number;
  percentageAfter: number;
  delta: number;
};

// future_self_events carries no link back to the path that caused it — a
// generation can also run after a check-in or reflection — so "the impact of
// this path choice" can't be reconstructed exactly. The closest deterministic
// proxy is the first batch of events recorded right after this path's
// chosen_at and before the next path was chosen: since a single
// generateFutureSelves() call writes all of its events back-to-back, events
// less than this far apart belong to the same run.
const FUTURE_SELF_IMPACT_RUN_GAP_MS = 10_000;

/** Splits timestamp-ordered rows into runs, starting a new one whenever the gap exceeds the threshold. */
function clusterByRun<T extends { created_at: string }>(rows: T[], gapMs: number): T[][] {
  const runs: T[][] = [];
  let current: T[] | null = null;
  let lastTime = 0;

  for (const row of rows) {
    const time = new Date(row.created_at).getTime();
    if (current && time - lastTime <= gapMs) {
      current.push(row);
    } else {
      current = [row];
      runs.push(current);
    }
    lastTime = time;
  }

  return runs;
}

/**
 * For every chosen path, returns the Future Self percentage movement from
 * the generation that ran immediately after it was chosen (and before the
 * next path was chosen), keyed by path id. Only futures that actually moved
 * are included — a future left untouched by a generation produces no event
 * at all, so this never fabricates a zero-impact entry.
 */
export async function loadFutureSelfImpactByPath(): Promise<Map<string, FutureSelfImpactEntry[]>> {
  const auth = await requireUser();
  if ("error" in auth) {
    return new Map();
  }

  const supabase = await createClient();

  const [{ data: pathRows }, { data: eventRows }, { data: futureSelfRows }] = await Promise.all([
    supabase
      .from("paths")
      .select("id, chosen_at")
      .eq("user_id", auth.userId)
      .eq("is_chosen", true)
      .order("chosen_at", { ascending: true }),
    supabase
      .from("future_self_events")
      .select("future_self_id, event_type, percentage_before, percentage_after, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: true }),
    supabase.from("future_selves").select("id, name").eq("user_id", auth.userId),
  ]);

  const chosenPaths = (pathRows ?? []).filter(
    (path): path is { id: string; chosen_at: string } => path.chosen_at !== null,
  );
  const events = eventRows ?? [];
  const nameById = new Map((futureSelfRows ?? []).map((row) => [row.id, row.name]));
  const impactByPath = new Map<string, FutureSelfImpactEntry[]>();

  chosenPaths.forEach((path, index) => {
    const windowStart = path.chosen_at;
    const windowEnd = chosenPaths[index + 1]?.chosen_at ?? null;

    const eventsInWindow = events.filter(
      (event) =>
        event.created_at >= windowStart && (windowEnd === null || event.created_at < windowEnd),
    );

    const [firstRun] = clusterByRun(eventsInWindow, FUTURE_SELF_IMPACT_RUN_GAP_MS);
    if (!firstRun) return;

    const entries = firstRun
      .map((event) => ({
        futureSelfId: event.future_self_id,
        name: nameById.get(event.future_self_id) ?? "A future self",
        eventType: event.event_type,
        percentageBefore: event.percentage_before ?? 0,
        percentageAfter: event.percentage_after,
        delta: event.percentage_after - (event.percentage_before ?? 0),
      }))
      .filter((entry) => entry.delta !== 0)
      .sort((a, b) => b.delta - a.delta);

    if (entries.length > 0) {
      impactByPath.set(path.id, entries);
    }
  });

  return impactByPath;
}

// Every candidate path generated for a moment — not just the one eventually
// chosen — already carries AI-assigned themes from the moment it's
// generated. Unfiltered by is_chosen: chosen_at stays null until one of them
// actually is chosen, contributing nothing via the chosen-path loop below
// until then. Reuses data that already exists — no new schema, AI field, or
// migration.
type ChosenPathEvidence = {
  themes: ThemeName[];
  chosen_at: string | null;
  created_at: string;
};
type CheckInEvidence = { theme_changes: ThemeChange[]; created_at: string };
type IdentityUpdateEvidence = {
  themes: ThemeName[];
  update_type: IdentityUpdateType;
  created_at: string;
};
// One entry per moment — a situation's polarity, not its candidate paths.
// opportunity_themes/risk_themes are AI-assigned once per moment, in the
// same generation call that produces its candidate paths, so a single
// situation can strengthen futures matching its opportunity themes while
// weakening futures matching its risk themes, instead of acting as
// undifferentiated evidence for every future that shares any theme at all.
type SituationEvidence = {
  opportunity_themes: ThemeName[];
  risk_themes: ThemeName[];
  created_at: string;
};

type EvidenceBundle = {
  momentCount: number;
  chosenPaths: ChosenPathEvidence[];
  situations: SituationEvidence[];
  checkIns: CheckInEvidence[];
  identityUpdates: IdentityUpdateEvidence[];
};

type GenerationInput = EvidenceBundle | { error: string };

async function loadGenerationInput(userId: string): Promise<GenerationInput> {
  const supabase = await createClient();

  const [
    { data: moments, error: momentError },
    { data: chosenPaths, error: pathsError },
    { data: checkIns, error: checkInsError },
    { data: identityUpdates, error: updatesError },
  ] = await Promise.all([
    supabase
      .from("moments")
      .select("opportunity_themes, risk_themes, created_at")
      .eq("user_id", userId),
    supabase.from("paths").select("themes, chosen_at, created_at").eq("user_id", userId),
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
    momentCount: moments?.length ?? 0,
    chosenPaths: chosenPaths ?? [],
    situations: moments ?? [],
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
  situation: 2,
  check_in: 1,
} as const;

// A flat weight can't make a single new event visible on a mature account: a
// future accumulates one contribution per past piece of evidence that shares
// its theme, and themes repeat constantly, so a mature future can easily be
// carrying hundreds of raw points of history already. Scaling a weight
// itself doesn't fix this — it scales the entire historical sum by the same
// factor as the new contribution, so the new event's *share* of the total
// barely moves even at 10x (confirmed against real account data — see
// "things already investigated"; this was originally addressed with a
// recency boost scoped to chosen paths only, since they were the one
// evidence type with a clean "most recent" sense — but the same dilution
// affects every evidence type, not just chosen paths).
//
// The fix: split every contribution into one of two pools by age, instead of
// one flat sum. backgroundStrength is long-run identity — slow, cumulative,
// the same continuous decay as always. currentForce is only what happened
// within CURRENT_FORCE_WINDOW_DAYS — recent situations, recent chosen paths,
// recent check-ins, recent identity updates — multiplied up before being
// added back on top of the background. A single recent event can't get
// drowned out by months of history because it's never summed into the same
// pool as that history in the first place; it's a separate, amplified term.
// Once an event ages out of the window it simply joins backgroundStrength at
// its ordinary (unmultiplied) weight — nothing is ever double-counted, and
// nothing needs a separate decay schedule of its own.
//
// Continuous half-life decay, no floor: a contribution's weight keeps
// shrinking for as long as the trajectory runs, rather than settling at a
// permanent 25% minimum after 90 days. On an account with months of history,
// the old tiered/floored decay let accumulated evidence grow without bound,
// diluting the marginal effect of any single new piece of evidence to
// near-zero. A true half-life keeps the cumulative sum's steady state
// bounded by the recent evidence rate instead, so fresh evidence keeps a
// non-vanishing share of the total as the account matures.
const EVIDENCE_HALF_LIFE_DAYS = 21;

function evidenceDecay(ageDays: number): number {
  return Math.pow(0.5, ageDays / EVIDENCE_HALF_LIFE_DAYS);
}

function evidenceAgeDays(createdAt: string, now: string): number {
  return (new Date(now).getTime() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000);
}

// The current-force window reuses the same half-life rather than inventing a
// second number to tune: anything still within one half-life of its
// original weight is "recent enough to be live," anything older has already
// decayed past the halfway point and is purely background at that point.
// The multiplier is the one new tunable this phase adds — see the real-
// account investigation in the PR description for how its size was chosen.
const CURRENT_FORCE_WINDOW_DAYS = EVIDENCE_HALF_LIFE_DAYS;
const CURRENT_FORCE_MULTIPLIER = 10;

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

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !SUMMARY_STOPWORDS.has(word));
}

function tokenizeSummary(text: string): Set<string> {
  return new Set(tokenizeWords(text));
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
 * Adds a piece of evidence's contribution to whichever of the two pools its
 * age belongs to: still within the current-force window, or already
 * background. Both pools use the same evidenceDecay — only which running
 * total a contribution lands in (and whether CURRENT_FORCE_MULTIPLIER is
 * applied later) depends on age.
 */
function addToPool(
  pools: { backgroundStrength: number; currentForce: number },
  contribution: number,
  ageDays: number,
): void {
  if (ageDays <= CURRENT_FORCE_WINDOW_DAYS) {
    pools.currentForce += contribution;
  } else {
    pools.backgroundStrength += contribution;
  }
}

/**
 * Two-pool trajectory strength: backgroundStrength is long-run identity
 * (every matching piece of evidence older than the current-force window,
 * each discounted by age but never to zero), currentForce is only what's
 * happened within that window. effectiveStrength = backgroundStrength +
 * currentForce * CURRENT_FORCE_MULTIPLIER — a single recent event is never
 * summed into the same pool as months of history, so it can't be diluted
 * into invisibility by it, while still leaving accumulated history intact
 * once an event ages out of the window. Used directly as the
 * pre-normalization raw score rather than as a +/- delta on top of the
 * previous percentage: an additive delta on a fixed 0-100 scale can't
 * represent open-ended cumulative history without either going stale
 * (bounded to "since last generation," which is frequently empty) or
 * saturating the clamp ceiling (unbounded lookback) — the two failure modes
 * this replaces. normalizeToHundred rescales the result, so its absolute
 * magnitude doesn't matter, only its size relative to the other drafts in
 * the same run.
 */
function computeTrajectoryStrength(
  futureThemes: ThemeName[],
  evidence: EvidenceBundle,
  now: string,
): number {
  const pools = { backgroundStrength: 0, currentForce: 0 };

  for (const update of evidence.identityUpdates) {
    if (!sharesTheme(futureThemes, update.themes)) continue;
    const age = evidenceAgeDays(update.created_at, now);
    addToPool(pools, EVIDENCE_WEIGHTS[update.update_type] * evidenceDecay(age), age);
  }

  for (const checkIn of evidence.checkIns) {
    const age = evidenceAgeDays(checkIn.created_at, now);
    const decay = evidenceDecay(age);

    for (const change of checkIn.theme_changes) {
      if (!isPositiveThemeName(change.theme) || !futureThemes.includes(change.theme)) continue;
      // "weakened" is evidence against this trajectory, not for it —
      // strengthened/emerging confirm momentum, weakened counts against it.
      const sign = change.direction === "weakened" ? -1 : 1;
      addToPool(pools, sign * EVIDENCE_WEIGHTS.check_in * decay, age);
    }
  }

  // Situation evidence: directional, not undifferentiated. A situation
  // strengthens futures matching its opportunity themes and weakens futures
  // matching its risk themes — one contribution per moment either way, the
  // same continuous decay as everything else, no separate weight.
  for (const situation of evidence.situations) {
    const age = evidenceAgeDays(situation.created_at, now);
    const decay = evidenceDecay(age);

    if (sharesTheme(futureThemes, situation.opportunity_themes)) {
      addToPool(pools, EVIDENCE_WEIGHTS.situation * decay, age);
    }
    if (sharesTheme(futureThemes, situation.risk_themes)) {
      addToPool(pools, -EVIDENCE_WEIGHTS.situation * decay, age);
    }
  }

  for (const path of evidence.chosenPaths) {
    if (!path.chosen_at || !sharesTheme(futureThemes, path.themes)) continue;

    // Chosen-path confirmation: only the path actually picked contributes
    // here, scored from chosen_at. Recency is handled the same way as every
    // other evidence type now — via the current-force window below, not a
    // separate boost mechanism keyed to "most recently chosen."
    const age = evidenceAgeDays(path.chosen_at, now);
    addToPool(pools, EVIDENCE_WEIGHTS.chosen_path * evidenceDecay(age), age);
  }

  return pools.backgroundStrength + pools.currentForce * CURRENT_FORCE_MULTIPLIER;
}

// "Materially present" means repeated, not a one-off: a single risk-tagged
// situation or a single weakened check-in is normal noise, but two or more
// independent negative signals on the same theme — from either source, in
// any combination — means that theme has a real negative pattern behind it,
// not a fluke. Reuses the same EvidenceBundle already loaded for scoring;
// no new evidence source, no decay weighting (this is a yes/no eligibility
// gate for generation, not a strength computation).
const RISK_ELIGIBILITY_THRESHOLD = 2;

/**
 * Themes with enough negative-directional evidence (risk_themes on
 * situations, weakened check-ins) to require the next generation run to
 * ensure at least one risk-led draft, per findRiskEligibleThemes' threshold.
 */
function findRiskEligibleThemes(evidence: EvidenceBundle): ThemeName[] {
  const negativeSignalCount = new Map<ThemeName, number>();
  const increment = (theme: ThemeName) =>
    negativeSignalCount.set(theme, (negativeSignalCount.get(theme) ?? 0) + 1);

  for (const situation of evidence.situations) {
    for (const theme of situation.risk_themes) {
      increment(theme);
    }
  }

  for (const checkIn of evidence.checkIns) {
    for (const change of checkIn.theme_changes) {
      if (change.direction === "weakened" && isPositiveThemeName(change.theme)) {
        increment(change.theme);
      }
    }
  }

  return [...negativeSignalCount.entries()]
    .filter(([, count]) => count >= RISK_ELIGIBILITY_THRESHOLD)
    .map(([theme]) => theme);
}

// A growth trajectory and a risk trajectory can legitimately share themes —
// "Builds independence through relocation" and "Becomes isolated through
// relocation" are both about relocation and independence, but point in
// opposite directions. Theme overlap and wording similarity can't tell them
// apart on their own, so an explicit movement_direction conflict overrides
// both the near-duplicate and dominant-theme-pair checks below: a positive
// and a negative draft are never collapsed into one just for sharing
// themes, regardless of how similar their themes or wording are.
function hasOpposingDirection(
  a: Pick<MockFutureSelfDraft, "movement_direction">,
  b: Pick<MockFutureSelfDraft, "movement_direction">,
): boolean {
  return (
    (a.movement_direction === "positive" && b.movement_direction === "negative") ||
    (a.movement_direction === "negative" && b.movement_direction === "positive")
  );
}

// Within-batch duplicate detection: theme overlap is the gate (mirrors
// matchDraftsToExisting's gate), and name/summary similarity confirms it.
// Jaccard, not raw overlap count, because draft theme lists are short
// (1-3 entries) — a shared count of 2 means very different things for a
// 2-theme vs. a 5-theme list.
const DUPLICATE_THEME_JACCARD_THRESHOLD = 0.6;
const DUPLICATE_NAME_OR_SUMMARY_JACCARD_THRESHOLD = 0.5;

function isNearDuplicateTrajectory(a: MockFutureSelfDraft, b: MockFutureSelfDraft): boolean {
  if (hasOpposingDirection(a, b)) {
    return false;
  }

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

/**
 * The dominant theme pair is the first two themes in a draft's theme list
 * (or the single theme, if only one exists), compared order-independently.
 * Two drafts can pass dedupeDrafts() — different wording, not near-duplicate
 * by the Jaccard gates above — while still leading with the same two themes
 * and occupying the same identity territory (e.g. Independence+Stability
 * vs. Independence+Stability+Courage). This is a coarser, theme-only check
 * layered on top of dedupeDrafts, not a replacement for it.
 */
function dominantThemePairKey(themes: readonly ThemeName[]): string {
  return [...themes.slice(0, 2)].sort().join("+");
}

/**
 * Drops drafts that share a dominant theme pair within a single generation
 * batch. Same pairwise/greedy shape as dedupeDrafts: keeps the higher
 * computeTrajectoryStrength() draft, ties keep the earlier-indexed draft,
 * and a dropped draft is never replaced — the batch is simply allowed to
 * shrink.
 */
function enforceDominantThemePairDistinctness(
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
      if (
        dropped[j] ||
        hasOpposingDirection(drafts[i], drafts[j]) ||
        dominantThemePairKey(drafts[i].themes) !== dominantThemePairKey(drafts[j].themes)
      ) {
        continue;
      }

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

// Two drafts can have low theme overlap (failing dedupeDrafts' theme gate)
// and different dominant theme pairs (failing enforceDominantThemePairDistinctness)
// while still narrating the same underlying situation — e.g. "Relocating and
// Building Independently" and "Disciplined Solo Builder" both being about
// financial pressure, an interim job, and ongoing psychology applications.
// Theme tags are short and coarse (1-3 entries) and can't capture that; the
// actual subject matter lives in the prose — summary, prediction, benefits,
// consequences — which both checks above ignore. Term-frequency cosine
// similarity (not Jaccard) is used here deliberately: combining four fields
// per draft produces a large, mostly-unique vocabulary (specific benefit/
// consequence phrasing rarely repeats verbatim even on the same topic), and
// plain set-based Jaccard gets diluted by that noise. Cosine over term
// counts rewards drafts that repeat the same handful of subject words
// (e.g. "psychology", "financial", "interim") even amid a lot of
// non-overlapping phrasing, which is exactly the signal "same story,
// different words" leaves behind.
const SUBJECT_MATTER_COSINE_THRESHOLD = 0.32;

function combinedContentWords(
  draft: Pick<MockFutureSelfDraft, "summary" | "prediction" | "benefits" | "consequences">,
): string[] {
  return tokenizeWords(
    [draft.summary, draft.prediction, ...draft.benefits, ...draft.consequences].join(" "),
  );
}

function termFrequency(words: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }
  return frequency;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);

  for (const key of keys) {
    const x = a.get(key) ?? 0;
    const y = b.get(key) ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }

  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB);
}

/**
 * Same risk-trajectory protection as isNearDuplicateTrajectory and
 * enforceDominantThemePairDistinctness: a growth and a risk draft can
 * legitimately share the same subject matter ("Builds independence after
 * relocating" vs. "Becomes isolated after relocating" are both about
 * relocating) and must never be collapsed just because the topic overlaps —
 * only the direction tells them apart.
 */
function isSameSubjectMatter(a: MockFutureSelfDraft, b: MockFutureSelfDraft): boolean {
  if (hasOpposingDirection(a, b)) {
    return false;
  }

  const similarity = cosineSimilarity(
    termFrequency(combinedContentWords(a)),
    termFrequency(combinedContentWords(b)),
  );

  return similarity >= SUBJECT_MATTER_COSINE_THRESHOLD;
}

/**
 * Drops drafts that narrate the same subject matter within a single
 * generation batch, even when themes and dominant theme pairs differ enough
 * to pass the two checks above. Same pairwise/greedy shape: keeps the
 * higher computeTrajectoryStrength() draft, ties keep the earlier-indexed
 * draft, and a dropped draft is never replaced.
 */
function enforceSubjectMatterDistinctness(
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
      if (dropped[j] || !isSameSubjectMatter(drafts[i], drafts[j])) continue;

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

// Code-side enforcement for Future Self naming. The prompt already asks for
// verb-led trajectory phrasing and bans personality/archetype labels, but
// nothing previously stopped a label like "Disciplined Solo Builder" from
// reaching storage. This validates structurally (word count, and the
// "[Adjective(s)] [Identity Noun]" shape that's the actual signature of an
// archetype label) rather than against a deny-list of literal phrases, so it
// catches the pattern generally instead of only the prompt's own examples.
const MAX_FUTURE_SELF_NAME_WORDS = 8;

// Adjectives and nouns that recur in personality-type/archetype naming. Not
// exhaustive — exhaustive is impossible for natural language — but covers
// the shape the prompt explicitly warns against (e.g. "Disciplined Solo
// Builder", "Intentional Connector", "Strategic Independent Thinker").
const IDENTITY_LABEL_ADJECTIVES = new Set([
  "disciplined", "intentional", "strategic", "independent", "determined",
  "resilient", "focused", "bold", "decisive", "adaptive", "reflective",
  "persistent", "driven", "grounded", "curious", "practical", "confident",
  "patient", "loyal", "creative", "cautious", "restless", "quiet", "steady",
  "ambitious", "deliberate", "solo", "thoughtful", "mindful", "purposeful",
  "balanced", "authentic", "courageous", "fearless", "passionate",
]);

const IDENTITY_LABEL_NOUNS = new Set([
  "builder", "builders", "connector", "connectors", "thinker", "thinkers",
  "achiever", "achievers", "explorer", "explorers", "visionary", "visionaries",
  "strategist", "strategists", "creator", "creators", "leader", "leaders",
  "pioneer", "pioneers", "architect", "architects", "dreamer", "dreamers",
  "wanderer", "wanderers", "seeker", "seekers", "adventurer", "adventurers",
  "realist", "realists", "idealist", "idealists", "optimist", "optimists",
  "pragmatist", "pragmatists", "communicator", "communicators",
  "collaborator", "collaborators", "influencer", "influencers",
  "innovator", "innovators", "specialist", "specialists", "individual",
  "individuals",
]);

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Matches the structural shape of a personality/archetype label: 2-3 words,
 * ending in a known identity noun, with every preceding word a known
 * identity adjective. This is the shared shape behind "Intentional
 * Connector" (adjective + noun) and "Disciplined Solo Builder" (adjective +
 * adjective + noun) — checking the shape generally, rather than denying
 * specific phrases, catches names the prompt's own ban list doesn't name.
 */
function looksLikeIdentityLabel(name: string): boolean {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) {
    return false;
  }

  const lastWord = normalizeWord(words[words.length - 1]);
  if (!IDENTITY_LABEL_NOUNS.has(lastWord)) {
    return false;
  }

  return words.slice(0, -1).every((word) => IDENTITY_LABEL_ADJECTIVES.has(normalizeWord(word)));
}

function isValidFutureSelfName(name: string): boolean {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_FUTURE_SELF_NAME_WORDS) {
    return false;
  }

  return !looksLikeIdentityLabel(name);
}

// Deterministic trajectory-style fallback per theme, used only when a
// generated name fails validation. Each phrase leads with one of the
// preferred trajectory verbs (Builds/Moves/Chooses/Lets/Learns/Creates/
// Trades) and stays grounded in the theme that's already meant to ground the
// draft's evidence, so the rewrite preserves the draft's meaning instead of
// replacing it with something generic and unrelated. No new evidence is
// invented — it's a safe restatement of the trajectory the draft already
// represents.
const THEME_TRAJECTORY_NAME: Record<ThemeName, string> = {
  Connection: "Builds closer connections with others",
  Independence: "Moves toward greater independence",
  Curiosity: "Learns through curiosity and exploration",
  Stability: "Creates more stability and structure",
  Creativity: "Creates more room for creative work",
  Growth: "Chooses growth over staying comfortable",
  Belonging: "Builds a stronger sense of belonging",
  Leadership: "Chooses to lead and take initiative",
  Reflection: "Learns through ongoing reflection",
  Courage: "Trades comfort for courage",
};

const FALLBACK_TRAJECTORY_NAME = "Moves in a new direction";

/**
 * Deterministic rewrite for a name that fails validation — no AI call, no
 * fabricated evidence. Driven entirely by the draft's first theme, which is
 * already the model's own grounding for this trajectory.
 */
function rewriteFutureSelfName(draft: Pick<MockFutureSelfDraft, "themes">): string {
  const primaryTheme = draft.themes[0];
  return primaryTheme ? THEME_TRAJECTORY_NAME[primaryTheme] : FALLBACK_TRAJECTORY_NAME;
}

function ensureValidFutureSelfName(draft: MockFutureSelfDraft): string {
  return isValidFutureSelfName(draft.name) ? draft.name : rewriteFutureSelfName(draft);
}

/**
 * Continuity matching intentionally keeps an existing future's stored name
 * rather than switching to whatever the model drafted this run — that's the
 * point of continuity. But naming enforcement previously only ran on
 * insert, so a legacy invalid name (stored before enforcement existed, or
 * from before this check ran) could survive indefinitely once
 * continuity-matched, since update() never wrote `name` at all. This checks
 * the *existing* stored name against the same validation used at insert
 * time, and only when it's invalid does it correct it — using the draft's
 * themes (which are already being written to this row this generation) so
 * the corrected name stays consistent with the row's new theme set. A valid
 * existing name is returned untouched.
 */
function continuityEnforcedName(existing: FutureSelf, draft: MockFutureSelfDraft): string {
  return isValidFutureSelfName(existing.name) ? existing.name : rewriteFutureSelfName(draft);
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
    const riskFocusThemes = findRiskEligibleThemes(input);

    const generationResult = await runStructuredGeneration({
      userId: auth.userId,
      profile: "future_self",
      promptId: "future_self.discover",
      schema: futureSelfDiscoverOutputSchema,
      overrides: riskFocusThemes.length > 0 ? { riskFocusThemes } : undefined,
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

    // dedupeDrafts catches near-duplicate wording; this catches drafts that
    // still lead with the same two themes despite different wording.
    drafts = enforceDominantThemePairDistinctness(drafts, input, now);

    // Both checks above gate on themes, which are short and coarse enough
    // that two drafts can narrate the same underlying situation while still
    // passing both. This catches that by reading the actual prose instead.
    drafts = enforceSubjectMatterDistinctness(drafts, input, now);
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
    // Not floored at 0: risk evidence can pull a draft's raw strength below
    // zero, and normalizeToHundred needs that negative value intact to
    // shrink the total and shift share toward the other drafts — clamping
    // here would erase the asymmetry directional situation evidence exists
    // to create. (The Math.max(0, ...) calls elsewhere stay: those compare
    // candidates against each other within distinctness checks, not against
    // normalizeToHundred.)
    const raw = computeTrajectoryStrength(draft.themes, input, now);

    // Naming enforcement happens last, after matching/dedup have already run
    // on the model's original name — it only affects what gets written, not
    // which existing row a draft continues or how duplicates were resolved.
    return { draft: { ...draft, name: ensureValidFutureSelfName(draft) }, existing, raw };
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
          name: continuityEnforcedName(existing, draft),
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
        name: continuityEnforcedName(existing, draft),
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
