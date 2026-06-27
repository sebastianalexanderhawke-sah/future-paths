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

const DOT_COLORS = ["#F59E0B", "#34D399", "#38BDF8", "#A78BFA"];

function statusBadgeStyle(status: string): { bg: string; text: string; border: string } {
  if (status === "Exploring options")
    return { bg: "#060A10", text: "#38BDF8", border: "#0A1628" };
  if (status === "Forecast")
    return { bg: "#1A0A2A", text: "#A78BFA", border: "#2E1048" };
  return { bg: "#071210", text: "#34D399", border: "#0C2018" };
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
          padding: "12px 18px",
          textDecoration: "none",
          transition: "background-color 0.15s",
        }}
        className="hover:bg-[#0E0E0E]"
      >
        {/* Dot */}
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />

        {/* Title */}
        <span
          style={{
            fontSize: "13px",
            color: "#555",
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
              color: "#F59E0B",
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
