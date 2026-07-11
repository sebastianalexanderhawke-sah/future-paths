import { createClient } from "@/lib/supabase/server";

/**
 * The recent moments actively reinforcing a pattern — the Pattern Emerging
 * card's "Recent Activity" section. Like evidence-sources.ts before it, this
 * is a pure read of existing data: the pattern's persisted attribution list
 * (supporting_observations on the future_selves row, at most five ids) is
 * resolved to its ledger rows, and each row already knows when it happened,
 * which source recorded it, and which situation it belongs to. No scoring,
 * no recognition, no new calculation.
 */
export type PatternActivityKind = "situation" | "check-in" | "reflection";

export type PatternActivityItem = {
  id: string;
  kind: PatternActivityKind;
  /** Title of the situation the moment belongs to. */
  situationTitle: string;
  /** ISO timestamp of when the moment was recorded. */
  occurredAt: string;
  /** Destination for future clickable entries; unused by today's card. */
  href?: string;
};

/** The card shows only the most recent meaningful moments. */
export const PATTERN_ACTIVITY_LIMIT = 3;

const KIND_BY_SOURCE: Record<string, PatternActivityKind> = {
  situation_complete: "situation",
  check_in: "check-in",
  reflection_answer: "reflection",
};

export async function getRecentPatternActivity(
  observationIds: string[],
): Promise<PatternActivityItem[]> {
  if (observationIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("behavior_observations")
    .select("id, source_type, extracted_at, moments ( title )")
    .eq("user_id", user.id)
    .in("id", observationIds)
    .order("extracted_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const items: PatternActivityItem[] = [];
  for (const row of data) {
    const kind = KIND_BY_SOURCE[row.source_type];
    // Joined rows arrive as an object for a single FK match; tolerate the
    // array shape PostgREST uses when the relationship isn't inferred 1:1.
    const moment = Array.isArray(row.moments) ? row.moments[0] : row.moments;
    if (!kind || !moment?.title) continue;

    items.push({
      id: row.id,
      kind,
      situationTitle: moment.title,
      occurredAt: row.extracted_at,
    });
    if (items.length === PATTERN_ACTIVITY_LIMIT) break;
  }

  return items;
}
