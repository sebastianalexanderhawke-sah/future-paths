import Link from "next/link";

import { formatRelativeTime, isCheckInStale } from "@/lib/relative-time";
import type { Moment } from "@/types/database";

type MomentCardProps = {
  moment: Moment;
  chosenPathTitle?: string;
  lastCheckIn?: { created_at: string };
  hasForecast?: boolean;
};

export function MomentCard({
  moment,
  chosenPathTitle,
  lastCheckIn,
  hasForecast = false,
}: MomentCardProps) {
  const stale = isCheckInStale(lastCheckIn?.created_at);
  const checkInHref = `/moments/${moment.id}#check-in`;
  const cardHref = `/moments/${moment.id}`;

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300">
      <div className="flex items-start justify-between gap-3">
        <Link href={cardHref} className="flex-1 font-medium text-zinc-900 hover:underline underline-offset-2">
          {moment.title}
        </Link>

        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {stale ? (
            <Link
              href={checkInHref}
              className="rounded-full bg-[var(--state-contradiction-detected)]/12 px-2.5 py-0.5 text-[11px] font-medium leading-5 text-[var(--state-contradiction-detected)] hover:bg-[var(--state-contradiction-detected)]/20"
            >
              Check in
            </Link>
          ) : null}
          {hasForecast ? (
            <Link
              href={cardHref}
              className="rounded-full bg-[var(--state-emerging)]/12 px-2.5 py-0.5 text-[11px] font-medium leading-5 text-[var(--state-emerging)] hover:bg-[var(--state-emerging)]/20"
            >
              Forecast
            </Link>
          ) : null}
        </div>
      </div>

      {chosenPathTitle ? (
        <p className="mt-1.5 text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">Path:</span>{" "}
          {chosenPathTitle}
        </p>
      ) : null}

      {moment.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
          {moment.description}
        </p>
      ) : null}

      <Link href={cardHref} className="mt-3 block text-xs text-zinc-400 hover:text-zinc-600">
        {lastCheckIn ? (
          <>Last check-in: {formatRelativeTime(lastCheckIn.created_at)}</>
        ) : (
          "No check-ins yet"
        )}
      </Link>
    </div>
  );
}
