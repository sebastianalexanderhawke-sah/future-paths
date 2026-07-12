import Link from "next/link";

import { IconSparkle } from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";
import type { FocusArea } from "@/lib/focus-areas";
import type {
  EngagementActivity,
  EngagementActivityItem,
} from "@/lib/recent-activity";
import { formatRelativeTime } from "@/lib/relative-time";

/**
 * The Overview's engagement snapshot: how you've been spending your
 * attention lately, in three beats — how steadily you've shown up
 * (Consistency), where the attention went (Your Focus), and what it
 * actually looked like (Recently Active). Everything is observational:
 * existing rows, existing timestamps, no goals, no rewards, no judgment.
 *
 * Layout is section-per-beat inside the card's one translucent violet
 * panel, so future versions can extend a section (clickable feed rows —
 * EngagementActivityItem and FocusArea both already carry an optional
 * href — filters, monthly comparisons) without a redesign.
 */
type RecentActivityCardProps = {
  activity: EngagementActivity;
  /** Where recent attention went, strongest first (≤4, never padded). */
  focusAreas: FocusArea[];
};

/** Small uppercase beat label — the card's only structural signage. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
      {children}
    </p>
  );
}

/**
 * One area of life and how much recent thinking went toward it. The bar is
 * relative attention only — not success, importance, or progress — so it
 * stays a soft monochrome violet: width is the whole message. A small floor
 * keeps the faintest area visible without inflating it.
 */
function FocusRow({ area }: { area: FocusArea }) {
  const width = `${Math.round(12 + area.weight * 88)}%`;
  const body = (
    <div
      role="img"
      aria-label={`${area.theme}: ${area.mentions} recent ${
        area.mentions === 1 ? "moment" : "moments"
      } of attention`}
    >
      <p className="text-[14px] font-medium text-[#111]">{area.theme}</p>
      <div className="mt-1.5 h-2 rounded-full bg-[rgba(139,92,246,0.10)]">
        <div
          className="h-full rounded-full bg-[rgba(139,92,246,0.6)]"
          style={{ width }}
        />
      </div>
    </div>
  );

  if (area.href) {
    return (
      <Link
        href={area.href}
        className="block transition-opacity duration-150 hover:opacity-80"
      >
        {body}
      </Link>
    );
  }
  return body;
}

/** One thing the person did, phrased as an act — never as a data source. */
function ActivityRow({ item }: { item: EngagementActivityItem }) {
  const line =
    item.kind === "reflection"
      ? `Reflected on “${item.situationTitle}”`
      : item.kind === "check-in"
        ? `Checked in on “${item.situationTitle}”`
        : item.kind === "path"
          ? `Chose a path in “${item.situationTitle}”`
          : `Started exploring “${item.situationTitle}”`;

  const body = (
    <>
      <p className="text-[12px] text-[#9ca3af] first-letter:uppercase">
        {formatRelativeTime(item.occurredAt)}
      </p>
      <p className="mt-0.5 text-[14px] font-medium leading-[1.5] text-[#111]">
        {line}
      </p>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block py-3 transition-opacity duration-150 first:pt-0 last:pb-0 hover:opacity-80"
      >
        {body}
      </Link>
    );
  }
  return <div className="py-3 first:pt-0 last:pb-0">{body}</div>;
}

export function RecentActivityCard({
  activity,
  focusAreas,
}: RecentActivityCardProps) {
  const { consistency } = activity;
  const dayWord = (count: number) => (count === 1 ? "day" : "days");

  return (
    <OverviewCard className="px-9 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#8b5cf6]">
            <IconSparkle size={16} />
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">Recent Activity</h2>
        </div>
        <p className="mt-1 text-[12px] text-[#aab0bb]">
          How you&apos;ve been engaging with Reflection lately
        </p>
      </div>

      {/* One translucent violet surface, three observational beats divided
          by faint violet hairlines — no nested cards, no second color. */}
      <div className="divide-y divide-[rgba(139,92,246,0.12)] rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(139,92,246,0.06)] px-7">
        {/* Beat 1 — how steadily you've shown up. */}
        <div className="py-6">
          <SectionLabel>Consistency</SectionLabel>
          <div
            className="flex gap-1.5"
            role="img"
            aria-label={`${consistency.activeDaysThisWeek} active ${dayWord(
              consistency.activeDaysThisWeek,
            )} in the last seven`}
          >
            {consistency.weekDays.map((active, index) => (
              <span
                key={index}
                className={`h-2 flex-1 rounded-full ${
                  active
                    ? "bg-[rgba(139,92,246,0.6)]"
                    : "bg-[rgba(139,92,246,0.10)]"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-[14px] font-medium text-[#111]">
            {consistency.activeDaysThisWeek} active{" "}
            {dayWord(consistency.activeDaysThisWeek)} this week
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <p className="flex items-baseline justify-between text-[14px]">
              <span className="text-[#6b6b76]">Current streak</span>
              <span className="font-medium text-[#111]">
                {consistency.currentStreak} {dayWord(consistency.currentStreak)}
              </span>
            </p>
            <p className="flex items-baseline justify-between text-[14px]">
              <span className="text-[#6b6b76]">Longest streak</span>
              <span className="font-medium text-[#111]">
                {consistency.longestStreak} {dayWord(consistency.longestStreak)}
              </span>
            </p>
          </div>
        </div>

        {/* Beat 2 — where the attention went. Only areas the user's own
            entries actually carried, strongest first, never padded. */}
        <div className="py-5">
          <SectionLabel>Your Focus</SectionLabel>
          {focusAreas.length === 0 ? (
            <p className="text-[14px] leading-[1.6] text-[#6b6b76]">
              Not enough recent entries to see where your attention is going
              yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {focusAreas.map((area) => (
                <FocusRow key={area.theme} area={area} />
              ))}
            </div>
          )}
        </div>

        {/* Beat 3 — what it actually looked like, newest first. */}
        <div className="py-5 pb-6">
          <SectionLabel>Recently Active</SectionLabel>
          {activity.items.length === 0 ? (
            <p className="text-[14px] leading-[1.6] text-[#6b6b76]">
              Nothing recorded yet — your next situation, check-in, or
              reflection will appear here.
            </p>
          ) : (
            <div className="divide-y divide-[rgba(139,92,246,0.10)]">
              {activity.items.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href="/reflections"
          className="text-[13px] font-medium text-[#7c3aed] transition-opacity duration-150 hover:opacity-80"
        >
          View all activity →
        </Link>
      </div>
    </OverviewCard>
  );
}
