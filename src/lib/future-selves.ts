import { extractAndPersistBehaviorObservations } from "@/lib/behavior-extraction";
import { explainIdentities } from "@/lib/ai/explain-identity";
import { getIdentityById } from "@/lib/identity-library";
import {
  recognizeIdentitiesWithAttribution,
  type AttributableObservation,
} from "@/lib/identity-recognition";
import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import { createClient } from "@/lib/supabase/server";
import type { FutureSelf, FutureSelfEvent } from "@/types/database";

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

const MAX_RECOGNIZED_IDENTITIES = 5;

/**
 * New pipeline: Situation → Behavior Extraction → Behavior Ledger →
 * Dimension Scores → Identity Recognition → Identity Attribution →
 * AI Explanation → Future Self persistence.
 *
 * Identity recognition is fully deterministic (no AI). AI is called once per
 * recognized identity solely to generate why_emerging, growth_opportunities,
 * blind_spots, and likely_evolution — all numerical values and labels come
 * exclusively from the Identity Platform.
 *
 * @param momentId - When provided, behavior observations are extracted for
 *   this moment before recognition runs (skipped if already extracted).
 */
export async function generateFutureSelves(
  momentId?: string,
): Promise<{ futureSelves: FutureSelf[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();

  // Step 1: Extract behavior for the triggering moment if not yet done.
  if (momentId) {
    const { data: existing } = await supabase
      .from("behavior_observations")
      .select("id")
      .eq("moment_id", momentId)
      .eq("user_id", auth.userId)
      .limit(1);

    if (!existing?.length) {
      await extractAndPersistBehaviorObservations(auth.userId, momentId).catch(() => {});
    }
  }

  // Step 2: Load all behavior observations for this user, joined with moment titles.
  const { data: rawObservations, error: obsError } = await supabase
    .from("behavior_observations")
    .select("id, observation, signals, moment_id, extracted_at, moments(title)")
    .eq("user_id", auth.userId)
    .order("extracted_at", { ascending: true });

  if (obsError) {
    return { error: obsError.message };
  }

  // No observations yet — leave existing active futures untouched.
  if (!rawObservations?.length) {
    return listFutureSelves({ status: "active" });
  }

  // Step 3: Build AttributableObservation array for the recognition engine.
  const observations: AttributableObservation[] = rawObservations.map((row) => ({
    id: row.id,
    observation: row.observation,
    signals: row.signals,
    momentId: row.moment_id,
    momentTitle: (row.moments as { title: string } | null)?.title ?? "Untitled situation",
    extractedAt: row.extracted_at ?? undefined,
  }));

  // Step 4: Deterministic identity recognition — no AI involved.
  const recognizedIdentities = recognizeIdentitiesWithAttribution(observations);

  if (recognizedIdentities.length === 0) {
    return listFutureSelves({ status: "active" });
  }

  const topIdentities = recognizedIdentities.slice(0, MAX_RECOGNIZED_IDENTITIES);

  // Step 5: Load existing future_selves rows for continuity matching.
  const { data: existingRows, error: existingError } = await supabase
    .from("future_selves")
    .select("*")
    .eq("user_id", auth.userId);

  if (existingError) {
    return { error: existingError.message };
  }

  const allExisting = existingRows ?? [];

  // Step 6: Resolve identity profiles for all recognized identities.
  const entries = topIdentities.flatMap((match) => {
    const profile = getIdentityById(match.identityId);
    return profile ? [{ match, profile }] : [];
  });

  // Step 6b: Single AI request explains all recognized identities together.
  //          AI never selects or names identities — only explains them.
  const explanationResults = await explainIdentities(entries);
  const explanationById = new Map(explanationResults.map((r) => [r.identityId, r.explanation]));

  const now = new Date().toISOString();
  // Track which existing row IDs were matched this run (for fading unmatched rows).
  const matchedRowIds = new Set<string>();
  let hasMeaningfulTransition = false;

  // Step 7: Persist each identity.
  for (const { match, profile } of entries) {
    const explanation = explanationById.get(match.identityId)!;

    const percentage = match.likelihood;
    const evidenceStrength = match.evidenceStrength;

    const attributionFields = {
      identity_id: match.identityId,
      confidence: match.confidence,
      dimension_breakdown: match.dimensionBreakdown as unknown as Record<string, unknown>[],
      supporting_observations: match.supportingObservations as unknown as Record<string, unknown>[],
      supporting_situations: match.supportingSituations as unknown as Record<string, unknown>[],
      opposing_observations: match.opposingObservations as unknown as Record<string, unknown>[],
    };

    const contentFields = {
      name: profile.canonical_name,
      summary: profile.short_description,
      evidence_strength: evidenceStrength,
      // core_behaviors carries the library's canonical behaviors for this identity.
      core_behaviors: profile.typical_behaviors,
      // behavioral_evidence carries the user's actual supporting observations.
      behavioral_evidence: match.supportingObservations.map((o) => o.observationText),
      growth_opportunities: explanation.growth_opportunities,
      blind_spots: explanation.blind_spots,
      likely_evolution: explanation.likely_evolution,
      why_emerging: explanation.why_emerging,
      themes: [] as string[],
    };

    // Match first by identity_id (new-pipeline rows), then by canonical name
    // (legacy rows that happen to share a name with this identity).
    const existing =
      allExisting.find((r) => r.identity_id === match.identityId) ??
      allExisting.find((r) => !r.identity_id && r.name === profile.canonical_name);

    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from("future_selves")
        .insert({
          user_id: auth.userId,
          percentage,
          status: "active",
          ...contentFields,
          ...attributionFields,
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
        summary: `${profile.canonical_name} may be emerging from your patterns.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    matchedRowIds.add(existing.id);

    if (existing.status === "faded") {
      const { error: updateError } = await supabase
        .from("future_selves")
        .update({
          percentage,
          previous_percentage: existing.percentage,
          status: "active",
          updated_at: now,
          ...contentFields,
          ...attributionFields,
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
        summary: `${profile.canonical_name} may be returning as your patterns shift.`,
      });

      hasMeaningfulTransition = true;
      continue;
    }

    // Active future — always snapshot previous_percentage for trend tracking.
    const percentageIncreased = percentage > existing.percentage;
    const evidenceStrengthChanged = evidenceStrength !== existing.evidence_strength;

    const { error: updateError } = await supabase
      .from("future_selves")
      .update({
        percentage,
        previous_percentage: existing.percentage,
        updated_at: now,
        ...contentFields,
        ...attributionFields,
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
        summary: `${profile.canonical_name} may be gaining strength.`,
      });
    }

    if (evidenceStrengthChanged) {
      hasMeaningfulTransition = true;
    }
  }

  // Step 8: Fade every active future that was not matched this run.
  for (const existing of allExisting) {
    if (existing.status !== "active" || matchedRowIds.has(existing.id)) {
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
