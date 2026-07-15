import Link from "next/link";

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconPlus,
  IconTrendingUp,
} from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";

/**
 * One row of the three-second summary. This card answers "what changed?"
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

// Movement is the row's meaning, so movement owns the color: green growth,
// rose decline, blue for informational additions. Chips are outlined rings
// on white — lighter than filled chips, so the delta stays the loudest
// colored element in the row. Direction lives in the row icon and the
// qualifier; the delta itself is only the signed number ("+5", "-4").
const KIND_STYLES: Record<
  ChangeRow["kind"],
  {
    color: string;
    Icon: (props: { size?: number }) => React.JSX.Element;
  }
> = {
  up: { color: "#10b981", Icon: IconArrowUpRight },
  down: { color: "#f43f5e", Icon: IconArrowDownRight },
  added: { color: "#3b82f6", Icon: IconPlus },
};

type WhatsChangedCardProps = {
  rows: ChangeRow[];
};

export function WhatsChangedCard({ rows }: WhatsChangedCardProps) {
  return (
    // Overview Phase 2: one of the page's two summary cards — wider padding
    // and taller rows give it the room the removed activity card left.
    <OverviewCard className="flex flex-col px-10 py-9">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#10b981]">
            <IconTrendingUp size={16} />
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">
            What&apos;s Changed
          </h2>
        </div>
        <p className="mt-1 text-[12px] text-[#aab0bb]">
          Since you last checked in
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-[13px] leading-relaxed text-[#9ca3af]">
          Nothing has shifted yet. Each check-in teaches Reflection how your
          paths are really going — futures strengthen, weaken, or fade, and
          every movement lands here first.
        </p>
      ) : (
        <div>
          {rows.map((row, i) => {
            const style = KIND_STYLES[row.kind];
            return (
              <div
                key={row.key}
                className={[
                  "flex items-center gap-4 py-[18px]",
                  i < rows.length - 1 ? "border-b border-[#f5f5f5]" : "",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white"
                  style={{ borderColor: `${style.color}4d`, color: style.color }}
                >
                  <style.Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-[#111]">
                    {row.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#9ca3af]">
                    {row.detail}
                  </span>
                </span>
                {row.delta !== null ? (
                  <span
                    className="ml-auto whitespace-nowrap text-[15px] font-semibold tabular-nums"
                    style={{ color: style.color }}
                  >
                    {row.delta > 0 ? "+" : ""}
                    {row.delta}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/future-selves"
        className="mt-auto pt-6 text-[13px] font-medium text-[#9ca3af] transition-colors duration-150 hover:text-[#047857]"
      >
        View all changes →
      </Link>
    </OverviewCard>
  );
}
