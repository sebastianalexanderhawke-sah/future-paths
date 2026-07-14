import Link from "next/link";

import { IconBell, IconClock, IconCompass, IconSparkle } from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";

export type AttentionKind = "overdue" | "reflection" | "decision";

export type AttentionRow = {
  key: string;
  situationName: string;
  status: string;
  kind: AttentionKind;
  href: string;
};

// Category and urgency are SEPARATE channels, as in the reference design:
// the chip says what kind of work the row is (its icon + a calm family
// color), the status line says how urgent it is. Red appears only in the
// status of the one genuinely overdue thing — never as a chip color — so a
// full list can hold exactly one alarm. A reflection is an amber
// opportunity under a violet insight chip; an open decision is blue
// information end to end. Unknown kinds fall back to neutral so a new
// category never renders as a false alarm.
type ChipConfig = {
  Icon: (props: { size?: number }) => React.JSX.Element;
  bg: string;
  color: string;
  statusColor: string;
};

const KIND_CHIPS: Record<AttentionKind, ChipConfig> = {
  overdue: {
    Icon: IconClock,
    bg: "#fffbeb",
    color: "#f59e0b",
    statusColor: "#f43f5e",
  },
  reflection: {
    Icon: IconSparkle,
    bg: "#f5f3ff",
    color: "#8b5cf6",
    statusColor: "#f59e0b",
  },
  decision: {
    Icon: IconCompass,
    bg: "#eff6ff",
    color: "#3b82f6",
    statusColor: "#3b82f6",
  },
};

const NEUTRAL_CHIP: ChipConfig = {
  Icon: IconBell,
  bg: "#f4f4f5",
  color: "#52525b",
  statusColor: "#52525b",
};

type NeedsAttentionCardProps = {
  /** At most three rows — the page enforces the cap. The card answers
      "what requires my attention today?", not "what is everything?";
      the space left by fewer rows is intentional. */
  items: AttentionRow[];
  hiddenCount: number;
  /** Total attention items, shown in the "View all (N)" footer. */
  totalCount: number;
};

export function NeedsAttentionCard({
  items,
  hiddenCount,
  totalCount,
}: NeedsAttentionCardProps) {
  return (
    // Overview Phase 2: one of the page's two summary cards — wider padding
    // and taller rows give it the room the removed activity card left.
    <OverviewCard className="flex flex-col px-10 py-9">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#3f3f46]">
            <IconBell size={16} />
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">Needs Attention</h2>
        </div>
        <p className="mt-1 text-[12px] text-[#aab0bb]">
          What needs your focus
        </p>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-[13px] leading-relaxed text-[#9ca3af]">
          Nothing needs your focus right now. When a check-in comes due, a
          reflection question is ready, or a decision is still open, it waits
          for you here.
        </p>
      ) : (
        <div>
          {items.map((item, i) => {
            const chip = KIND_CHIPS[item.kind] ?? NEUTRAL_CHIP;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={[
                  "flex items-center gap-4 py-[18px] transition-opacity duration-150 hover:opacity-80",
                  i < items.length - 1 ? "border-b border-[#f5f5f5]" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: chip.bg, color: chip.color }}
                >
                  <chip.Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-[#111]">
                    {item.situationName}
                  </span>
                  <span
                    className="mt-0.5 block text-[12px] font-medium"
                    style={{ color: chip.statusColor }}
                  >
                    {item.status}
                  </span>
                </span>
                <span aria-hidden="true" className="ml-auto text-[16px] text-[#cccccc]">
                  ›
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/reflections"
        className="mt-auto pt-6 text-[13px] font-medium text-[#9ca3af] transition-colors duration-150 hover:text-[#6366f1]"
      >
        {hiddenCount > 0 ? `View all (${totalCount})` : "Open Workspace"} →
      </Link>
    </OverviewCard>
  );
}
