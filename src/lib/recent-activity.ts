import { createClient } from "@/lib/supabase/server";

/**
 * The Settings Reflection Activity summary's data: how steadily the user has
 * been engaging with Reflection. A pure read over existing rows and their
 * existing timestamps — check-ins, new situations, and chosen paths. Nothing
 * is scored, recognized, or stored; "activity" here is only what the user
 * demonstrably did.
 *
 * UX polish 2026-07-15: the Recent Activity feed (cross-feature items with
 * titles and links) and the weekly per-kind counts were removed with the
 * dashboard UI they fed — this read now returns only the consistency
 * summary the one-sentence card renders.
 */
export type EngagementConsistency = {
  /** Last seven days, oldest → today: was anything recorded that day? */
  weekDays: boolean[];
  activeDaysThisWeek: number;
  /** Consecutive active days ending today — or yesterday, so a quiet
      morning doesn't zero out an unbroken week. */
  currentStreak: number;
  longestStreak: number;
};

export type EngagementActivity = {
  consistency: EngagementConsistency;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

/** Calendar bucketing uses UTC days: deterministic on the server, and a
 *  streak is "did anything land that day", not a precise clock. */
function dayKeyOf(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/**
 * Pure consistency summary over raw activity timestamps. Deliberately
 * observational — counts and runs, no goals, no rewards.
 */
export function summarizeConsistency(
  timestamps: string[],
  now: Date = new Date(),
): EngagementConsistency {
  const activeDays = new Set<number>();
  for (const stamp of timestamps) {
    const ms = Date.parse(stamp);
    if (!Number.isNaN(ms)) activeDays.add(dayKeyOf(ms));
  }

  const today = dayKeyOf(now.getTime());

  const weekDays = Array.from({ length: WEEK_DAYS }, (_, i) =>
    activeDays.has(today - (WEEK_DAYS - 1) + i),
  );
  const activeDaysThisWeek = weekDays.filter(Boolean).length;

  let currentStreak = 0;
  const streakAnchor = activeDays.has(today)
    ? today
    : activeDays.has(today - 1)
      ? today - 1
      : null;
  if (streakAnchor !== null) {
    let day = streakAnchor;
    while (activeDays.has(day)) {
      currentStreak += 1;
      day -= 1;
    }
  }

  let longestStreak = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of [...activeDays].sort((a, b) => a - b)) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  return { weekDays, activeDaysThisWeek, currentStreak, longestStreak };
}

const EMPTY_ACTIVITY: EngagementActivity = {
  consistency: {
    weekDays: Array.from({ length: WEEK_DAYS }, () => false),
    activeDaysThisWeek: 0,
    currentStreak: 0,
    longestStreak: 0,
  },
};

export async function getEngagementActivity(): Promise<EngagementActivity> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return EMPTY_ACTIVITY;
  }

  // Timestamp-only history (bounded) drives the consistency summary.
  // Consistency counts what the user typed (check-ins, situations, chosen
  // paths), not what the system generated from it.
  const [checkIns, moments, chosenPaths] = await Promise.all([
    supabase
      .from("check_ins")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("moments")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("paths")
      .select("chosen_at")
      .eq("user_id", user.id)
      .eq("is_chosen", true)
      .order("chosen_at", { ascending: false })
      .limit(1000),
  ]);

  const timestamps: string[] = [];

  for (const row of checkIns.data ?? []) {
    timestamps.push(row.created_at);
  }

  for (const row of moments.data ?? []) {
    timestamps.push(row.created_at);
  }

  for (const row of chosenPaths.data ?? []) {
    if (row.chosen_at) timestamps.push(row.chosen_at);
  }

  return { consistency: summarizeConsistency(timestamps) };
}
