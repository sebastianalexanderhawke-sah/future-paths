import Link from "next/link";

import { OverviewCard } from "@/components/overview/overview-card";

export type AttentionRow = {
  key: string;
  situationName: string;
  status: string;
  statusColor: string;
  href: string;
};

// Category-aware chips: each row's icon wears its own status color over the
// matching family soft — overdue reads urgent (rose), a due check-in reads
// timely (amber), an open decision reads possible (violet) — while every
// chip keeps the identical quiet shape and size. Unknown status colors fall
// back to neutral so a new category never renders as a false alarm.
const SOFT_BY_STATUS_COLOR: Record<string, string> = {
  "#f43f5e": "#fff1f2",
  "#e11d48": "#fff1f2",
  "#f59e0b": "#fffbeb",
  "#b45309": "#fffbeb",
  "#8b5cf6": "#f5f3ff",
  "#7c3aed": "#f5f3ff",
  "#6366f1": "#eef2ff",
  "#4f46e5": "#eef2ff",
  "#10b981": "#ecfdf5",
  "#047857": "#ecfdf5",
};

function chipStyleFor(statusColor: string): { bg: string; color: string } {
  const bg = SOFT_BY_STATUS_COLOR[statusColor];
  return bg ? { bg, color: statusColor } : { bg: "#f4f4f5", color: "#52525b" };
}

type NeedsAttentionCardProps = {
  items: AttentionRow[];
  hiddenCount: number;
};

export function NeedsAttentionCard({ items, hiddenCount }: NeedsAttentionCardProps) {
  return (
    <OverviewCard className="flex flex-col px-8 py-7">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[18px] leading-none text-[#888888]">
            🔔
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">Needs Attention</h2>
        </div>
        <p className="mt-[3px] text-[13px] text-[#888888]">
          What needs your focus
        </p>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-[13px] leading-relaxed text-[#888888]">
          Nothing needs your attention right now.
        </p>
      ) : (
        <div>
          {items.map((item, i) => {
            const chip = chipStyleFor(item.statusColor);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={[
                  "flex items-center gap-3.5 py-3.5 transition-opacity duration-150 hover:opacity-80",
                  i < items.length - 1 ? "border-b border-[#f5f5f5]" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-semibold"
                  style={{ background: chip.bg, color: chip.color }}
                >
                  {(item.situationName.charAt(0) || "•").toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-[#111]">
                    {item.situationName}
                  </span>
                  <span
                    className="mt-0.5 block text-[12px] font-medium"
                    style={{ color: item.statusColor }}
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
        className="mt-auto pt-4 text-[13px] font-medium text-[#888888] transition-colors duration-150 hover:text-[#6366f1]"
      >
        Open Workspace{hiddenCount > 0 ? ` (${hiddenCount} more)` : ""} →
      </Link>
    </OverviewCard>
  );
}
