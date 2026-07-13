import Link from "next/link";

import {
  IconClock,
  IconCompass,
  IconPenLine,
  IconRoute,
  IconSparkle,
} from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";
import type { FocusArea } from "@/lib/focus-areas";
import type {
  EngagementActivityItem,
  EngagementActivityKind,
  EngagementConsistency,
  WeeklyActivityCounts,
} from "@/lib/recent-activity";
import { formatRelativeTime } from "@/lib/relative-time";

/**
 * Overview Phase 4: the bottom section is ONE elevated card — a quick pulse
 * check, not an analytics dashboard. Three compact sections sit side by
 * side, reading left to right: Recently Active (what you did) →
 * Consistency (how steadily) → Your Focus (where the attention went).
 * Everything stays observational: existing rows, existing timestamps, no
 * goals, no rewards, no percentages.
 */
type YourActivityCardProps = {
  /** Newest first — the Recently Active feed. */
  items: EngagementActivityItem[];
  /** Week strip + active-day count for the Consistency section. */
  consistency: EngagementConsistency;
  /** Past-week event counts for the Consistency statistics. */
  weeklyCounts: WeeklyActivityCounts;
  /** Life areas receiving recent attention, strongest first. */
  focusAreas: FocusArea[];
  /** One-sentence summary of where attention has been (buildFocusInsight). */
  insight: string | null;
};

/** Small uppercase section label — the card's only structural signage. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
      {children}
    </p>
  );
}

function activityLine(item: EngagementActivityItem): string {
  switch (item.kind) {
    case "reflection":
      return `Reflected on “${item.situationTitle}”`;
    case "check-in":
      return `Checked in on “${item.situationTitle}”`;
    case "path":
      return `Chose a path in “${item.situationTitle}”`;
    default:
      return `Started exploring “${item.situationTitle}”`;
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
};

function ActivityRow({ item }: { item: EngagementActivityItem }) {
  const Icon = KIND_ICONS[item.kind];
  const body = (
    <>
      <span aria-hidden="true" className="shrink-0 text-[#9ca3af]">
        <Icon size={14} />
      </span>
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#111]">
        {activityLine(item)}
      </p>
      <p className="shrink-0 text-[11px] text-[#9ca3af] first-letter:uppercase">
        {formatRelativeTime(item.occurredAt)}
      </p>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="flex items-center gap-2.5 py-2 transition-opacity duration-150 first:pt-0 last:pb-0 hover:opacity-80"
      >
        {body}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
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

function ConsistencySection({
  consistency,
  weeklyCounts,
  now,
}: {
  consistency: EngagementConsistency;
  weeklyCounts: WeeklyActivityCounts;
  now?: Date;
}) {
  const letters = weekDayLetters(now);
  const active = consistency.activeDaysThisWeek;

  return (
    <div>
      <SectionLabel>Consistency</SectionLabel>
      <div
        className="flex gap-1.5"
        role="img"
        aria-label={`Active ${active} of the last 7 days`}
      >
        {consistency.weekDays.map((wasActive, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
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

      <p className="mt-4 text-[13px] leading-relaxed text-[#6b6b76]">
        {active === 0
          ? "A quiet week so far — anything you record counts as showing up."
          : `You've been active ${active} of the last 7 days.`}
      </p>
    </div>
  );
}

function FocusRow({ area }: { area: FocusArea }) {
  // A small floor keeps the faintest area visible without inflating it.
  const width = `${Math.round(12 + area.weight * 88)}%`;
  return (
    <div
      role="img"
      aria-label={`${area.theme}: ${area.mentions} recent ${
        area.mentions === 1 ? "moment" : "moments"
      } of attention`}
    >
      <p className="text-[13px] font-medium text-[#111]">{area.theme}</p>
      <div className="mt-1 h-2 rounded-full bg-[rgba(139,92,246,0.10)]">
        <div
          className="h-full rounded-full bg-[rgba(139,92,246,0.6)]"
          style={{ width }}
        />
      </div>
    </div>
  );
}

export function YourActivityCard({
  items,
  consistency,
  weeklyCounts,
  focusAreas,
  insight,
}: YourActivityCardProps) {
  return (
    <OverviewCard className="px-9 py-8">
      <div className="mb-7">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#8b5cf6]">
            <IconSparkle size={16} />
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">Your Activity</h2>
        </div>
        <p className="mt-1 text-[12px] text-[#aab0bb]">
          A quick snapshot of how you&apos;ve been engaging with Reflection
          recently
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#f5f5f5]">
        {/* Section 1 — what you did, newest first. */}
        <section className="pr-8">
          <SectionLabel>Recently Active</SectionLabel>
          {items.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-[#9ca3af]">
              Nothing recorded yet — the moment you start a situation, check
              in, or answer a reflection, it shows up here.
            </p>
          ) : (
            <div className="divide-y divide-[#f7f7f8]">
              {items.map((item) => (
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

        {/* Section 2 — how steadily you showed up. */}
        <section className="px-8">
          <ConsistencySection
            consistency={consistency}
            weeklyCounts={weeklyCounts}
          />
        </section>

        {/* Section 3 — where the attention went, closed by one insight. */}
        <section className="pl-8">
          <SectionLabel>Your Focus</SectionLabel>
          {focusAreas.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-[#9ca3af]">
              Not enough recent entries to see where your attention is going
              yet — as your check-ins and chosen paths accumulate, the life
              areas you&apos;re tending appear here.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {focusAreas.map((area) => (
                <FocusRow key={area.theme} area={area} />
              ))}
            </div>
          )}
          {insight ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[rgba(139,92,246,0.06)] px-3 py-2.5">
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-[#8b5cf6]">
                <IconSparkle size={12} />
              </span>
              <p className="text-[12px] leading-relaxed text-[#6b6b76]">
                {insight}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </OverviewCard>
  );
}
