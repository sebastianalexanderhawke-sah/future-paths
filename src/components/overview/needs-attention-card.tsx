import Link from "next/link";

import { OverviewCard } from "@/components/overview/overview-card";

export type AttentionRow = {
  key: string;
  situationName: string;
  status: string;
  statusColor: string;
  href: string;
};

// Soft chip backgrounds cycled by row; the letter picks up the same accent.
const CHIP_STYLES = [
  { bg: "#eef2ff", color: "#6366f1" },
  { bg: "#f0fdf4", color: "#22c55e" },
  { bg: "#eff6ff", color: "#3b82f6" },
];

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
            const chip = CHIP_STYLES[i % CHIP_STYLES.length];
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
        href="/moments"
        className="mt-auto pt-4 text-[13px] font-medium text-[#888888] transition-colors duration-150 hover:text-[#6366f1]"
      >
        View all{hiddenCount > 0 ? ` (${hiddenCount} more)` : ""} →
      </Link>
    </OverviewCard>
  );
}
