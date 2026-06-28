import Link from "next/link";

import { formatRelativeTime } from "@/lib/relative-time";
import type { Moment } from "@/types/database";

type MomentCardProps = {
  moment: Moment;
  chosenPathTitle?: string;
  lastCheckIn?: { created_at: string };
  /** @deprecated no longer rendered; kept optional so older callers still compile. */
  hasForecast?: boolean;
  /** When "dark", renders the dark-theme row used on the overview page. */
  variant?: "dark" | "light";
  /** Index used to cycle dot colors in dark variant. */
  dotColorIndex?: number;
  /** Shows amber "Check in →" CTA in dark variant. */
  isOverdue?: boolean;
};

// One of exactly four statuses: Exploring options, Forecast, Checking in,
// Resolved. Archived moments are shown separately (homepage's collapsed
// "Resolved situations" list), so this card only needs the three active ones.
function statusLabel(
  chosenPathTitle: string | undefined,
  lastCheckIn: { created_at: string } | undefined,
): string {
  if (!chosenPathTitle) return "Exploring options";
  if (!lastCheckIn) return "Forecast";
  return "Checking in";
}

const DOT_COLORS = ["#f59e0b", "#60a5fa", "#22c55e", "#8b7cf8"];

function statusBadgeStyle(status: string): { bg: string; text: string; border: string } {
  if (status === "Exploring options")
    return { bg: "#e4edfb", text: "#1a58c0", border: "#9cc4f0" };
  if (status === "Forecast")
    return { bg: "#ecebfc", text: "#6b54e0", border: "#c4bef8" };
  return { bg: "#e6f4ed", text: "#1a8044", border: "#9cd4b0" };
}

export function MomentCard({
  moment,
  chosenPathTitle,
  lastCheckIn,
  variant = "light",
  dotColorIndex = 0,
  isOverdue,
}: MomentCardProps) {
  const cardHref = `/moments/${moment.id}`;
  const status = statusLabel(chosenPathTitle, lastCheckIn);

  if (variant === "dark") {
    const badge = statusBadgeStyle(status);
    const dotColor = DOT_COLORS[dotColorIndex % DOT_COLORS.length]!;

    return (
      <Link
        href={cardHref}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 36px",
          textDecoration: "none",
          borderBottom: "1px solid #e8e0f8",
          transition: "background-color 0.15s",
        }}
        className="hover:bg-[#ece8fc]"
      >
        {/* Dot */}
        <span
          style={{
            width: "9px",
            height: "9px",
            borderRadius: "50%",
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />

        {/* Title */}
        <span
          style={{
            fontSize: "13px",
            color: "#1e0e60",
            fontWeight: 500,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {moment.title}
        </span>

        {/* Status badge */}
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: "20px",
            border: `1px solid ${badge.border}`,
            backgroundColor: badge.bg,
            color: badge.text,
            flexShrink: 0,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {status}
        </span>

        {/* Overdue CTA */}
        {isOverdue ? (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#f59e0b",
              marginLeft: "6px",
              flexShrink: 0,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Check in →
          </span>
        ) : null}
      </Link>
    );
  }

  // Default light variant (used on /moments page and other non-overview pages)
  return (
    <Link
      href={cardHref}
      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300"
    >
      <span className="min-w-0 flex-1 truncate font-medium text-zinc-900">{moment.title}</span>
      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium leading-5 text-zinc-600">
        {status}
      </span>
      <span className="shrink-0 text-xs text-zinc-400">
        {lastCheckIn ? formatRelativeTime(lastCheckIn.created_at) : "No activity yet"}
      </span>
    </Link>
  );
}
