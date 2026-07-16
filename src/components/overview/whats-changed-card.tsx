import Link from "next/link";

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconPlus,
  IconTrendingUp,
} from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";

/**
 * One item of the three-second summary. This card answers "what changed?"
 * and nothing else — no stories, no explanations. WHY things are moving is
 * Pattern Emerging's job. Rows come from future_self_events: lifecycle
 * transitions (New / Returned / Faded) carry no movement value; movement
 * rows net the window's events into one signed number.
 */
export type ChangeRow = {
  key: string;
  name: string;
  /** One-word qualifier: Strengthened / Weakened / Faded / Returned / New / "N added". */
  detail: string;
  /** Signed point movement, rendered without a "%"; null renders no delta (e.g. counts). */
  delta: number | null;
  kind: "up" | "down" | "added";
};

// Movement is the item's meaning, so movement owns the color: green growth,
// rose decline, blue for informational additions. Chips are light tinted
// circles — the same treatment as Current Self's evidence chips — so the
// delta stays the loudest colored element in the item. Direction lives in
// the chip icon and the qualifier; the delta itself is only the signed
// number ("+5", "-4").
const KIND_STYLES: Record<
  ChangeRow["kind"],
  {
    bg: string;
    color: string;
    /** The signed delta is TEXT at 13px, so it reads through the
        theme-aware accent tokens (4.5:1 on light and dark); the chip icon
        keeps the family 500 (decorative, aria-hidden). */
    textColor: string;
    Icon: (props: { size?: number }) => React.JSX.Element;
  }
> = {
  up: {
    bg: "#ecfdf5",
    color: "#10b981",
    textColor: "var(--accent-growth)",
    Icon: IconArrowUpRight,
  },
  down: {
    bg: "#fef2f2",
    color: "#f43f5e",
    textColor: "var(--accent-attention)",
    Icon: IconArrowDownRight,
  },
  added: {
    bg: "#eff6ff",
    color: "#3b82f6",
    textColor: "var(--accent-info)",
    Icon: IconPlus,
  },
};

type WhatsChangedCardProps = {
  rows: ChangeRow[];
};

export function WhatsChangedCard({ rows }: WhatsChangedCardProps) {
  return (
    // Overview Phase 3: one short full-width strip under the Future Selves
    // hero. Changes sit side by side as columns instead of stacked rows, so
    // the card stays short no matter how many of the three items are
    // present. Header and footer follow the shared Overview card grammar
    // (icon 16 + 17px bold title, 12px subtitle; footer action bottom-left).
    <OverviewCard className="flex flex-col px-10 py-6">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#10b981]">
            <IconTrendingUp size={16} />
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">
            What&apos;s Changed
          </h2>
        </div>
        <p className="mt-1 text-[12px] text-[#6b7280]">
          Since you last checked in
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-[#6b7280]">
          Nothing has shifted yet. Each check-in teaches Reflection how your
          paths are really going — futures strengthen, weaken, or fade, and
          every movement lands here first.
        </p>
      ) : (
        <div className="flex items-center">
          {rows.map((row, i) => {
            const style = KIND_STYLES[row.kind];
            return (
              <div
                key={row.key}
                className={[
                  "flex min-w-0 flex-1 items-center gap-3",
                  // Subtle vertical dividers between columns, none outside.
                  i > 0 ? "border-l border-[#f5f5f5] pl-6" : "",
                  i < rows.length - 1 ? "pr-6" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: style.bg, color: style.color }}
                >
                  <style.Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-[#111]">
                    {row.name}
                  </span>
                  <span className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="truncate text-[12px] text-[#6b7280]">
                      {row.detail}
                    </span>
                    {row.delta !== null ? (
                      <span
                        className="whitespace-nowrap text-[13px] font-semibold tabular-nums"
                        style={{ color: style.textColor }}
                      >
                        {row.delta > 0 ? "+" : ""}
                        {row.delta}
                      </span>
                    ) : null}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/future-selves"
        className="mt-auto pt-6 text-[13px] font-medium text-[#6b7280] transition-colors duration-150 hover:text-[#047857]"
      >
        View all changes →
      </Link>
    </OverviewCard>
  );
}
