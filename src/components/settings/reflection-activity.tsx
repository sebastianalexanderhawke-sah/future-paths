import Link from "next/link";

import { OverviewCard } from "@/components/overview/overview-card";
import type { EngagementConsistency } from "@/lib/recent-activity";

/**
 * Settings' consistency summary — deliberately lightweight (UX polish
 * 2026-07-15): one sentence on how steadily you've shown up, and a link
 * onward. The Recent Activity feed, the week strip, and the weekly counts
 * were removed with their data plumbing — the profile states a fact, it is
 * not a dashboard. Still observational: existing rows, existing timestamps,
 * no goals, no rewards, no percentages.
 */
type ReflectionActivityCardProps = {
  /** Active-day count over the rolling seven-day window. */
  consistency: EngagementConsistency;
};

export function ReflectionActivityCard({
  consistency,
}: ReflectionActivityCardProps) {
  return (
    <OverviewCard className="px-9 py-7">
      <div className="mb-4">
        <h2 className="text-[17px] font-bold text-[#111]">
          Reflection Activity
        </h2>
        <p className="mt-[3px] text-[13px] text-[#888888]">
          How you&apos;ve been using Reflection
        </p>
      </div>

      <p className="text-[14px] leading-[1.6] text-[#333333]">
        You&apos;ve reflected on {consistency.activeDaysThisWeek} of the last 7
        days.
      </p>

      <Link
        href="/reflections"
        className="mt-3 inline-block text-[13px] font-medium text-[#9ca3af] transition-colors duration-150 hover:text-[#7c3aed]"
      >
        See activity →
      </Link>
    </OverviewCard>
  );
}
