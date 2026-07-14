import Link from "next/link";

import {
  IconBookOpen,
  IconClock,
  IconCompass,
  IconPenLine,
  IconRoute,
  IconSparkle,
  IconTrendingUp,
} from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";
import {
  ACTIVITY_FEED_LIMIT,
  type EngagementActivityItem,
  type EngagementActivityKind,
  type EngagementConsistency,
  type WeeklyActivityCounts,
} from "@/lib/recent-activity";
import { formatRelativeTime } from "@/lib/relative-time";

/**
 * Overview Phase 2 (2026-07-14): the activity summary relocated from the
 * Overview's Your Activity card to Settings — product usage and personal
 * statistics live with the profile, so the Overview stays about the user's
 * life, not their activity inside Reflection. The internals are the same
 * relocation, not a redesign: the chronological cross-feature feed (what
 * happened, where, when) and the Consistency strip + weekly counts, all
 * observational — existing rows, existing timestamps, no goals, no rewards,
 * no percentages.
 */
type ReflectionActivityCardProps = {
  /** Newest first — the card renders the first ACTIVITY_FEED_LIMIT. */
  items: EngagementActivityItem[];
  /** Week strip + active-day count for the Consistency section. */
  consistency: EngagementConsistency;
  /** Past-week event counts for the Consistency statistics. */
  weeklyCounts: WeeklyActivityCounts;
};

/** Small uppercase section label — the card's only structural signage. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
      {children}
    </p>
  );
}

/** WHAT happened — the feed row's first line, one label per activity kind. */
const KIND_LABELS: Record<EngagementActivityKind, string> = {
  situation: "Situation created",
  reflection: "Reflection written",
  "check-in": "Check-in completed",
  forecast: "Future Forecast generated",
  path: "Future Path selected",
  "future-self": "Future Self updated",
  chapter: "Timeline chapter created",
};

/** WHERE it happened — the feed row's second line. */
function activityPlace(item: EngagementActivityItem): string {
  switch (item.kind) {
    case "future-self":
      return `Future Selves · ${item.situationTitle}`;
    case "chapter":
      return `Timeline · ${item.situationTitle}`;
    default:
      return item.situationTitle;
  }
}

// One quiet gray glyph per activity type — recognition, not decoration.
const KIND_ICONS: Record<
  EngagementActivityKind,
  (props: { size?: number }) => React.JSX.Element
> = {
  reflection: IconPenLine,
  "check-in": IconClock,
  path: IconRoute,
  situation: IconCompass,
  forecast: IconTrendingUp,
  "future-self": IconSparkle,
  chapter: IconBookOpen,
};

function ActivityRow({ item }: { item: EngagementActivityItem }) {
  const Icon = KIND_ICONS[item.kind];
  // What happened → where it happened → when it happened.
  const body = (
    <>
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#9ca3af]">
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#111]">
          {KIND_LABELS[item.kind]}
        </span>
        <span className="mt-px block truncate text-[12px] text-[#9ca3af]">
          {activityPlace(item)}
        </span>
      </span>
      <p className="shrink-0 text-[11px] text-[#9ca3af] first-letter:uppercase">
        {formatRelativeTime(item.occurredAt)}
      </p>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="flex items-start gap-2.5 py-2.5 transition-opacity duration-150 first:pt-0 last:pb-0 hover:opacity-80"
      >
        {body}
      </Link>
    );
  }
  return (
    <div className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
      {body}
    </div>
  );
}

/**
 * Weekday letters for the rolling seven-day strip, oldest → today. Uses UTC
 * weekdays to match the UTC day bucketing behind consistency.weekDays.
 */
export function weekDayLetters(now: Date = new Date()): string[] {
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now.getTime() - (6 - i) * 86400000);
    return letters[day.getUTCDay()]!;
  });
}

function WeeklyStatRow({ label, count }: { label: string; count: number }) {
  return (
    <p className="flex items-baseline justify-between text-[13px]">
      <span className="text-[#6b6b76]">{label}</span>
      <span className="font-medium text-[#111]">{count} this week</span>
    </p>
  );
}

export function ReflectionActivityCard({
  items,
  consistency,
  weeklyCounts,
}: ReflectionActivityCardProps) {
  const feedItems = items.slice(0, ACTIVITY_FEED_LIMIT);
  const letters = weekDayLetters();
  const active = consistency.activeDaysThisWeek;

  return (
    <OverviewCard className="px-9 py-7">
      <div className="mb-5">
        <h2 className="text-[17px] font-bold text-[#111]">
          Reflection Activity
        </h2>
        <p className="mt-[3px] text-[13px] text-[#888888]">
          How you&apos;ve been using Reflection
        </p>
      </div>

      <p className="mb-6 text-[14px] leading-[1.6] text-[#333333]">
        You&apos;ve reflected on {active} of the last 7 days.
      </p>

      <div className="grid grid-cols-2 divide-x divide-[#f5f5f5]">
        {/* The chronological feed: what, where, when. */}
        <section className="pr-8">
          <SectionLabel>Recent Activity</SectionLabel>
          {feedItems.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-[#9ca3af]">
              Nothing recorded yet — the moment you start a situation, check
              in, or answer a reflection, it shows up here.
            </p>
          ) : (
            <div className="divide-y divide-[#f7f7f8]">
              {feedItems.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
          <Link
            href="/reflections"
            className="mt-4 inline-block text-[12px] font-medium text-[#9ca3af] transition-colors duration-150 hover:text-[#7c3aed]"
          >
            View all activity →
          </Link>
        </section>

        {/* How steadily you showed up. */}
        <section className="pl-8">
          <SectionLabel>Consistency</SectionLabel>
          <div
            className="flex gap-1.5"
            role="img"
            aria-label={`Active ${active} of the last 7 days`}
          >
            {consistency.weekDays.map((wasActive, index) => (
              <div
                key={index}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[10px] font-medium text-[#9ca3af]">
                  {letters[index]}
                </span>
                <span
                  className={`h-6 w-full max-w-[26px] rounded-[7px] ${
                    wasActive
                      ? "bg-[rgba(139,92,246,0.6)]"
                      : "bg-[rgba(139,92,246,0.10)]"
                  }`}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 border-t border-[#f7f7f8] pt-3.5">
            <WeeklyStatRow label="Reflections" count={weeklyCounts.reflections} />
            <WeeklyStatRow label="Check-ins" count={weeklyCounts.checkIns} />
            <WeeklyStatRow label="Paths Chosen" count={weeklyCounts.pathsChosen} />
          </div>
        </section>
      </div>
    </OverviewCard>
  );
}
