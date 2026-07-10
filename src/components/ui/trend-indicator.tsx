import { getFutureSelfTrend } from "@/lib/future-self-trend";
import type { FutureSelf } from "@/types/database";

type TrendIndicatorProps = {
  futureSelf: Pick<FutureSelf, "percentage" | "previous_percentage">;
  className?: string;
};

export function TrendIndicator({ futureSelf, className = "" }: TrendIndicatorProps) {
  const { delta, direction } = getFutureSelfTrend(futureSelf);

  if (direction === "new" || direction === "flat") {
    return null;
  }

  const arrow = direction === "up" ? "↑" : "↓";
  // Family 700s: the small trend glyph must clear AA contrast on white.
  const colorClass = direction === "up" ? "text-emerald-700" : "text-rose-700";

  return (
    <span className={`${colorClass} ${className}`}>
      {arrow} {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}
