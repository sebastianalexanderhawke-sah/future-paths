import { createClient } from "@/lib/supabase/server";

/**
 * The Recent Activity card's data: how the user has been engaging with
 * Reflection lately. A pure read over existing rows and their existing
 * timestamps — check-ins (whose rows also carry reflection answers), new
 * situations, chosen paths, generated forecasts, Future Self updates, and
 * Timeline chapters. Nothing is scored, recognized, or stored; "activity"
 * here is only what the user demonstrably did (or what their record
 * demonstrably produced).
 */
export type EngagementActivityKind =
  | "reflection"
  | "check-in"
  | "situation"
  | "path"
  | "forecast"
  | "future-self"
  | "chapter";

export type EngagementActivityItem = {
  id: string;
  kind: EngagementActivityKind;
  /**
   * WHERE the activity happened: the situation's title for
   * situation-scoped kinds, the Future Self's name for "future-self",
   * the chapter's month label for "chapter".
   */
  situationTitle: string;
  /** ISO timestamp of the underlying row — never invented. */
  occurredAt: string;
  /** Destination the feed row links to. */
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

/**
 * The Consistency section's compact statistics: how many of each kind of
 * engagement happened in the last seven days. Same kind semantics as the
 * feed — a reflected check-in counts as the reflection it became.
 */
export type WeeklyActivityCounts = {
  reflections: number;
  checkIns: number;
  pathsChosen: number;
};

export type EngagementActivity = {
  consistency: EngagementConsistency;
  weeklyCounts: WeeklyActivityCounts;
  /**
   * Newest first, at most ACTIVITY_FEED_POOL. The card renders the first
   * ACTIVITY_FEED_LIMIT; the extras let What's Changed backfill its three
   * rows without a second fetch.
   */
  items: EngagementActivityItem[];
};

/** The card shows exactly this many rows — a glance, not a log. */
export const ACTIVITY_FEED_LIMIT = 3;

/** How many merged items the read returns for the card + backfill uses. */
export const ACTIVITY_FEED_POOL = 8;

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

/** Events within the last seven days (today inclusive, UTC day keys). */
function countRecentEvents(timestamps: string[], today: number): number {
  let count = 0;
  for (const stamp of timestamps) {
    const ms = Date.parse(stamp);
    if (Number.isNaN(ms)) continue;
    const day = dayKeyOf(ms);
    if (day > today - WEEK_DAYS && day <= today) count += 1;
  }
  return count;
}

/**
 * Pure past-week event counts per engagement kind. Same UTC day window as
 * summarizeConsistency, so the statistics always agree with the strip.
 */
export function countWeeklyActivity(
  input: { reflections: string[]; checkIns: string[]; pathsChosen: string[] },
  now: Date = new Date(),
): WeeklyActivityCounts {
  const today = dayKeyOf(now.getTime());
  return {
    reflections: countRecentEvents(input.reflections, today),
    checkIns: countRecentEvents(input.checkIns, today),
    pathsChosen: countRecentEvents(input.pathsChosen, today),
  };
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
  weeklyCounts: { reflections: 0, checkIns: 0, pathsChosen: 0 },
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
  // reflection it became, dated by the row it lives on. Forecasts, Future
  // Self updates, and Timeline chapters join the FEED only — Consistency
  // keeps counting what the user typed (check-ins, situations, paths), not
  // what the system generated from it.
  const [checkIns, moments, chosenPaths, forecasts, futureSelves, chapters] =
    await Promise.all([
      supabase
        .from("check_ins")
        .select("id, moment_id, created_at, reflection_answer, moments ( title )")
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
        .select("id, moment_id, chosen_at, moments ( title )")
        .eq("user_id", user.id)
        .eq("is_chosen", true)
        .order("chosen_at", { ascending: false })
        .limit(1000),
      supabase
        .from("forecasts")
        .select("id, moment_id, generated_at, moments ( title )")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(ACTIVITY_FEED_POOL),
      supabase
        .from("future_selves")
        .select("id, name, updated_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1),
      supabase
        .from("monthly_identity_narratives")
        .select("month, generated_at")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(ACTIVITY_FEED_POOL),
    ]);

  const items: EngagementActivityItem[] = [];
  const timestamps: string[] = [];
  const checkInTimestamps: string[] = [];
  const reflectionTimestamps: string[] = [];
  const pathTimestamps: string[] = [];

  for (const row of checkIns.data ?? []) {
    timestamps.push(row.created_at);
    // Kind semantics match the feed: an answered check-in counts as the
    // reflection it became, an unanswered one as a check-in.
    if (row.reflection_answer) {
      reflectionTimestamps.push(row.created_at);
    } else {
      checkInTimestamps.push(row.created_at);
    }
    const title = titleOf(row.moments as JoinedMoment);
    if (!title) continue;
    items.push({
      id: `check-in-${row.id}`,
      kind: row.reflection_answer ? "reflection" : "check-in",
      situationTitle: title,
      occurredAt: row.created_at,
      href: `/moments/${row.moment_id}`,
    });
  }

  for (const row of moments.data ?? []) {
    timestamps.push(row.created_at);
    items.push({
      id: `situation-${row.id}`,
      kind: "situation",
      situationTitle: row.title,
      occurredAt: row.created_at,
      href: `/moments/${row.id}`,
    });
  }

  for (const row of chosenPaths.data ?? []) {
    if (!row.chosen_at) continue;
    timestamps.push(row.chosen_at);
    pathTimestamps.push(row.chosen_at);
    const title = titleOf(row.moments as JoinedMoment);
    if (!title) continue;
    items.push({
      id: `path-${row.id}`,
      kind: "path",
      situationTitle: title,
      occurredAt: row.chosen_at,
      href: `/moments/${row.moment_id}`,
    });
  }

  for (const row of forecasts.data ?? []) {
    const title = titleOf(row.moments as JoinedMoment);
    if (!title || !row.generated_at) continue;
    items.push({
      id: `forecast-${row.id}`,
      kind: "forecast",
      situationTitle: title,
      occurredAt: row.generated_at,
      href: `/moments/${row.moment_id}`,
    });
  }

  // One item per generation run, not one per Future Self: a run touches
  // every active row at once, and five identical rows would flood the feed.
  const latestFutureSelf = (futureSelves.data ?? [])[0];
  if (latestFutureSelf?.updated_at) {
    items.push({
      id: `future-self-${latestFutureSelf.id}`,
      kind: "future-self",
      situationTitle: latestFutureSelf.name,
      occurredAt: latestFutureSelf.updated_at,
      href: "/future-selves",
    });
  }

  for (const row of chapters.data ?? []) {
    if (!row.generated_at) continue;
    items.push({
      id: `chapter-${row.month}`,
      kind: "chapter",
      situationTitle: row.month,
      occurredAt: row.generated_at,
      href: "/timeline",
    });
  }

  return {
    consistency: summarizeConsistency(timestamps),
    weeklyCounts: countWeeklyActivity({
      reflections: reflectionTimestamps,
      checkIns: checkInTimestamps,
      pathsChosen: pathTimestamps,
    }),
    items: buildActivityFeed(items, ACTIVITY_FEED_POOL),
  };
}
