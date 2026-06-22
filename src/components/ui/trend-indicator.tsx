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
  const colorClass = direction === "up" ? "text-emerald-600" : "text-rose-600";

  return (
    <span className={`${colorClass} ${className}`}>
      {arrow} {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}
