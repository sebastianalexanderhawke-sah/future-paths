import { rowToLedgerObservation } from "@/lib/behavior-ledger-shadow";
import { buildIdentityBrief, type IdentityBrief } from "@/lib/identity-brief";
import type { createClient } from "@/lib/supabase/server";

// The ONE place a feature obtains the shared Identity Brief for a user.
//
// Consumers (Current Self today; Future Selves, Timeline, Monthly Reflection
// as they migrate) call this instead of fetching ledger rows themselves —
// the Behavior Engine owns identity, and this accessor is the boundary:
// one query shape, one fold (buildIdentityBrief), zero per-feature
// deterministic reasoning. The brief is a pure projection rebuilt on read;
// it is deliberately not persisted (see docs/identity-brief.md).

export type IdentityBriefSourceResult =
  | { ok: true; brief: IdentityBrief; observationCount: number }
  | { ok: false; error: string };

export async function getIdentityBriefForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<IdentityBriefSourceResult> {
  const { data, error } = await supabase
    .from("behavior_observations")
    .select("id, moment_id, observation, signals, source_type, extracted_at")
    .eq("user_id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (data ?? []).map(rowToLedgerObservation);

  return { ok: true, brief: buildIdentityBrief(rows), observationCount: rows.length };
}
