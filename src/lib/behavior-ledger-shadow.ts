import {
  buildLedgerSnapshot,
  type BehaviorLedgerSnapshot,
  type LedgerObservation,
} from "@/lib/behavior-ledger";
import {
  ALL_DIMENSIONS,
  computeDimensionScoresFromObservations,
  isValidSignalSlug,
  type SignalSlug,
} from "@/lib/behavior-signals";
import { buildIdentityBrief } from "@/lib/identity-brief";
import type { createClient } from "@/lib/supabase/server";
import type { BehaviorObservation } from "@/types/database";

// ---------------------------------------------------------------------------
// Behavior Engine v4 — Phase 1: shadow mode
// ---------------------------------------------------------------------------
//
// Every time observations are extracted, the legacy engine's aggregation and
// the new ledger both run over the same rows, and any disagreement is logged
// in development. This is diagnostics only:
//
//   - it never throws (a shadow failure must not fail the extraction),
//   - it writes nothing,
//   - it surfaces nothing to users (server logs only, and only outside
//     production),
//   - no feature reads its result.
//
// The legacy path (computeDimensionScoresFromObservations) remains the sole
// source of truth for everything users see.

export type LedgerDiscrepancy = {
  kind: "dimension_score" | "raw_count" | "signal_set";
  detail: string;
};

// Dimension scores are the same sum grouped two different ways (per
// observation vs. per signal), so any real divergence shows up far above
// float-associativity noise.
const SCORE_EPSILON = 1e-6;

export function rowToLedgerObservation(row: {
  id: string;
  moment_id: string;
  observation: string;
  signals: string[];
  source_type: string;
  extracted_at: string | null;
}): LedgerObservation {
  return {
    id: row.id,
    observation: row.observation,
    signals: row.signals,
    momentId: row.moment_id,
    sourceType: row.source_type,
    extractedAt: row.extracted_at ?? undefined,
  };
}

/**
 * Compares a ledger snapshot against the legacy aggregation of the same
 * observations. Pure; returns an empty array when the two engines agree.
 */
export function findLedgerDiscrepancies(
  snapshot: BehaviorLedgerSnapshot,
  observations: LedgerObservation[],
): LedgerDiscrepancy[] {
  const discrepancies: LedgerDiscrepancy[] = [];

  // 1. Dimension-score parity with the legacy engine.
  const legacyScores = computeDimensionScoresFromObservations(observations);
  for (const dimension of ALL_DIMENSIONS) {
    const legacy = legacyScores[dimension];
    const ledger = snapshot.dimensionScores[dimension];
    if (Math.abs(legacy - ledger) > SCORE_EPSILON) {
      discrepancies.push({
        kind: "dimension_score",
        detail: `${dimension}: legacy=${legacy} ledger=${ledger}`,
      });
    }
  }

  // 2. Per-signal raw counts against a direct count over the rows.
  const directCounts = new Map<SignalSlug, number>();
  for (const observation of observations) {
    for (const slug of observation.signals) {
      if (!isValidSignalSlug(slug)) continue;
      directCounts.set(slug, (directCounts.get(slug) ?? 0) + 1);
    }
  }

  const snapshotCounts = new Map(
    snapshot.signals.map((state) => [state.slug, state.rawCount]),
  );

  for (const [slug, count] of directCounts) {
    const ledgerCount = snapshotCounts.get(slug);
    if (ledgerCount === undefined) {
      discrepancies.push({
        kind: "signal_set",
        detail: `${slug}: present in observations (${count}) but missing from ledger`,
      });
    } else if (ledgerCount !== count) {
      discrepancies.push({
        kind: "raw_count",
        detail: `${slug}: direct=${count} ledger=${ledgerCount}`,
      });
    }
  }

  for (const slug of snapshotCounts.keys()) {
    if (!directCounts.has(slug)) {
      discrepancies.push({
        kind: "signal_set",
        detail: `${slug}: present in ledger but absent from observations`,
      });
    }
  }

  return discrepancies;
}

/** Builds the snapshot and compares it to the legacy engine in one call. */
export function compareLedgerToLegacy(
  observations: LedgerObservation[],
): LedgerDiscrepancy[] {
  return findLedgerDiscrepancies(buildLedgerSnapshot(observations), observations);
}

/**
 * The shadow pass run after every successful observation insert: reads the
 * user's full ledger, folds it, compares both engines, and logs any
 * disagreement in development. Never throws.
 */
export async function runBehaviorLedgerShadow(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}): Promise<void> {
  const { supabase, userId } = input;

  try {
    const { data, error } = await supabase
      .from("behavior_observations")
      .select("id, moment_id, observation, signals, source_type, extracted_at")
      .eq("user_id", userId);

    if (error || !data) {
      return;
    }

    const rows = data as Pick<
      BehaviorObservation,
      "id" | "moment_id" | "observation" | "signals" | "source_type" | "extracted_at"
    >[];

    const ledgerObservations = rows.map(rowToLedgerObservation);
    const discrepancies = compareLedgerToLegacy(ledgerObservations);

    // Phase 2: build the Identity Brief from the same ledger rows on every
    // rebuild. It is deliberately not persisted — no feature consumes it yet
    // and persistence would need a new table; the build here exercises the
    // full pipeline (and would surface any thrown error via this catch)
    // without changing anything user-visible.
    buildIdentityBrief(ledgerObservations);

    if (discrepancies.length > 0 && process.env.NODE_ENV !== "production") {
      console.warn(
        `[behavior-ledger] shadow mode found ${discrepancies.length} discrepancy(ies) for user ${userId}:\n` +
          discrepancies.map((d) => `  - [${d.kind}] ${d.detail}`).join("\n"),
      );
    }
  } catch {
    // Shadow mode must never affect the primary extraction pipeline.
  }
}
