import { createClient } from "@/lib/supabase/server";

/**
 * The Recent Activity card's data: how the user has been engaging with
 * Reflection lately. A pure read over existing rows and their existing
 * timestamps — check-ins (whose rows also carry reflection answers), new
 * situations, and chosen paths. Nothing is scored, recognized, or stored;
 * "activity" here is only what the user demonstrably did.
 */
export type EngagementActivityKind =
  | "reflection"
  | "check-in"
  | "situation"
  | "path";

export type EngagementActivityItem = {
  id: string;
  kind: EngagementActivityKind;
  /** Title of the situation the activity belongs to. */
  situationTitle: string;
  /** ISO timestamp of the underlying row — never invented. */
  occurredAt: string;
  /** Destination for future clickable feed rows; unused by today's card. */
  href?: string;
};

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
  /** Newest first, at most ACTIVITY_FEED_LIMIT. */
  items: EngagementActivityItem[];
};

/** The feed stays a glance, not a log. */
export const ACTIVITY_FEED_LIMIT = 4;

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

/** Pure merge of activity items: newest first, capped for the card. */
export function buildActivityFeed(
  items: EngagementActivityItem[],
  limit: number = ACTIVITY_FEED_LIMIT,
): EngagementActivityItem[] {
  return [...items]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, limit);
}

const EMPTY_ACTIVITY: EngagementActivity = {
  consistency: {
    weekDays: Array.from({ length: WEEK_DAYS }, () => false),
    activeDaysThisWeek: 0,
    currentStreak: 0,
    longestStreak: 0,
  },
  items: [],
};

type JoinedMoment = { title: string } | { title: string }[] | null;

function titleOf(moment: JoinedMoment): string | null {
  const row = Array.isArray(moment) ? moment[0] : moment;
  return row?.title ?? null;
}

export async function getEngagementActivity(): Promise<EngagementActivity> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return EMPTY_ACTIVITY;
  }

  // Timestamp-only history (bounded) drives the streaks; the same rows'
  // newest few become the feed. Reflections live on check-in rows and have
  // no timestamp of their own, so an answered check-in surfaces as the
  // reflection it became, dated by the row it lives on.
  const [checkIns, moments, chosenPaths] = await Promise.all([
    supabase
      .from("check_ins")
      .select("id, created_at, reflection_answer, moments ( title )")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("moments")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("paths")
      .select("id, chosen_at, moments ( title )")
      .eq("user_id", user.id)
      .eq("is_chosen", true)
      .order("chosen_at", { ascending: false })
      .limit(1000),
  ]);

  const items: EngagementActivityItem[] = [];
  const timestamps: string[] = [];

  for (const row of checkIns.data ?? []) {
    timestamps.push(row.created_at);
    const title = titleOf(row.moments as JoinedMoment);
    if (!title) continue;
    items.push({
      id: `check-in-${row.id}`,
      kind: row.reflection_answer ? "reflection" : "check-in",
      situationTitle: title,
      occurredAt: row.created_at,
    });
  }

  for (const row of moments.data ?? []) {
    timestamps.push(row.created_at);
    items.push({
      id: `situation-${row.id}`,
      kind: "situation",
      situationTitle: row.title,
      occurredAt: row.created_at,
    });
  }

  for (const row of chosenPaths.data ?? []) {
    if (!row.chosen_at) continue;
    timestamps.push(row.chosen_at);
    const title = titleOf(row.moments as JoinedMoment);
    if (!title) continue;
    items.push({
      id: `path-${row.id}`,
      kind: "path",
      situationTitle: title,
      occurredAt: row.chosen_at,
    });
  }

  return {
    consistency: summarizeConsistency(timestamps),
    items: buildActivityFeed(items),
  };
}
