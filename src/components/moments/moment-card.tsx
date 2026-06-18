import Link from "next/link";

import { formatRelativeTime } from "@/lib/relative-time";
import type { Moment } from "@/types/database";

type MomentCardProps = {
  moment: Moment;
  chosenPathTitle?: string;
  lastCheckIn?: { created_at: string };
  /** @deprecated no longer rendered; kept optional so older callers still compile. */
  hasForecast?: boolean;
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

export function MomentCard({ moment, chosenPathTitle, lastCheckIn }: MomentCardProps) {
  const cardHref = `/moments/${moment.id}`;

  return (
    <Link
      href={cardHref}
      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300"
    >
      <span className="min-w-0 flex-1 truncate font-medium text-zinc-900">{moment.title}</span>
      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium leading-5 text-zinc-600">
        {statusLabel(chosenPathTitle, lastCheckIn)}
      </span>
      <span className="shrink-0 text-xs text-zinc-400">
        {lastCheckIn ? formatRelativeTime(lastCheckIn.created_at) : "No activity yet"}
      </span>
    </Link>
  );
}
