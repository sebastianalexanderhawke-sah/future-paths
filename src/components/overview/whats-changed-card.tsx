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
 * Pattern Emerging's job. A recent fade arrives here as an ordinary
 * "Faded" row whose delta is the strength the path last held.
 */
export type ChangeRow = {
  key: string;
  name: string;
  /** One-word qualifier: Strengthened / Weakened / Faded / "N added". */
  detail: string;
  /** Signed percentage-point movement; null renders no delta (e.g. counts). */
  delta: number | null;
  kind: "up" | "down" | "added";
};

// Movement is the row's meaning, so movement owns the color: green growth,
// rose decline, blue for informational additions. Chips are outlined rings
// on white — lighter than filled chips, so the delta stays the loudest
// colored element in the row.
const KIND_STYLES: Record<
  ChangeRow["kind"],
  {
    color: string;
    glyph: string;
    Icon: (props: { size?: number }) => React.JSX.Element;
  }
> = {
  up: { color: "#10b981", glyph: "↑", Icon: IconArrowUpRight },
  down: { color: "#f43f5e", glyph: "↓", Icon: IconArrowDownRight },
  added: { color: "#3b82f6", glyph: "", Icon: IconPlus },
};

type WhatsChangedCardProps = {
  rows: ChangeRow[];
};

export function WhatsChangedCard({ rows }: WhatsChangedCardProps) {
  return (
    <OverviewCard className="flex flex-col px-8 py-8">
      <div className="mb-7">
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
                  "flex items-center gap-4 py-4",
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
                    {row.delta}%
                    {style.glyph ? (
                      <span className="ml-1 text-[13px]">{style.glyph}</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/future-selves"
        className="mt-auto pt-5 text-[13px] font-medium text-[#9ca3af] transition-colors duration-150 hover:text-[#047857]"
      >
        View all changes →
      </Link>
    </OverviewCard>
  );
}
