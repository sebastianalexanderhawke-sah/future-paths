import { createClient } from "@/lib/supabase/server";

/**
 * Where a pattern's strongest persisted evidence came from, counted per
 * extraction source. Drives the Pattern Emerging card's five-dot evidence
 * meter: each count is how many of the future's persisted top supporting
 * observations (the attribution list already stored on the future_selves
 * row, at most five) were extracted from that source.
 *
 * A pure read of existing data — no scoring, no recognition, no new
 * calculation. The buckets mirror behavior-extraction's source_type values:
 * "situation_complete" (decision-time), "check_in", "reflection_answer".
 */
export type EvidenceSourceCounts = {
  situations: number;
  checkIns: number;
  reflections: number;
};

export const EMPTY_EVIDENCE_SOURCE_COUNTS: EvidenceSourceCounts = {
  situations: 0,
  checkIns: 0,
  reflections: 0,
};

export async function getEvidenceSourceCounts(
  observationIds: string[],
): Promise<EvidenceSourceCounts> {
  const counts = { ...EMPTY_EVIDENCE_SOURCE_COUNTS };
  if (observationIds.length === 0) {
    return counts;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return counts;
  }

  const { data, error } = await supabase
    .from("behavior_observations")
    .select("id, source_type")
    .eq("user_id", user.id)
    .in("id", observationIds);

  if (error || !data) {
    return counts;
  }

  for (const row of data) {
    if (row.source_type === "situation_complete") counts.situations += 1;
    else if (row.source_type === "check_in") counts.checkIns += 1;
    else if (row.source_type === "reflection_answer") counts.reflections += 1;
  }

  return counts;
}
