import Link from "next/link";

import { OverviewCard } from "@/components/overview/overview-card";

export type ChangeRow = {
  key: string;
  name: string;
  detail: string;
  /** Signed percentage-point movement; null renders no delta (e.g. counts). */
  delta: number | null;
  kind: "up" | "down" | "added";
};

const KIND_STYLES: Record<ChangeRow["kind"], { bg: string; color: string; glyph: string }> = {
  up: { bg: "#f0fdf4", color: "#22c55e", glyph: "↑" },
  down: { bg: "#fff5f5", color: "#ef4444", glyph: "↓" },
  added: { bg: "#eff6ff", color: "#3b82f6", glyph: "+" },
};

type WhatsChangedCardProps = {
  rows: ChangeRow[];
};

export function WhatsChangedCard({ rows }: WhatsChangedCardProps) {
  return (
    <OverviewCard className="flex flex-col px-8 py-7">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[20px] leading-none text-[#22c55e]">
            ↗
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">
            What&apos;s Changed
          </h2>
        </div>
        <p className="mt-[3px] text-[13px] text-[#888888]">
          Since your last reflection
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-[13px] leading-relaxed text-[#888888]">
          Nothing has shifted yet. Check in on a situation and movement will
          show up here.
        </p>
      ) : (
        <div>
          {rows.map((row, i) => {
            const style = KIND_STYLES[row.kind];
            return (
              <div
                key={row.key}
                className={[
                  "flex items-center gap-3.5 py-3.5",
                  i < rows.length - 1 ? "border-b border-[#f5f5f5]" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px]"
                  style={{ background: style.bg, color: style.color }}
                >
                  {style.glyph}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-[#111]">
                    {row.name}
                  </span>
                  <span className="mt-px block text-[12px] text-[#888888]">
                    {row.detail}
                  </span>
                </span>
                {row.delta !== null ? (
                  <span
                    className="ml-auto whitespace-nowrap text-[14px] font-bold"
                    style={{ color: style.color }}
                  >
                    {row.delta > 0 ? "+" : ""}
                    {row.delta}% {style.glyph}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/future-selves"
        className="mt-auto pt-4 text-[13px] font-medium text-[#888888] transition-colors duration-150 hover:text-[#6366f1]"
      >
        View all changes →
      </Link>
    </OverviewCard>
  );
}
