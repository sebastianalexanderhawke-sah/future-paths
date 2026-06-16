import type { CheckIn } from "@/types/database";

import { isDifficultCheckInTheme } from "@/lib/check-in-themes";

type CheckInCardProps = {
  checkIn: CheckIn;
  identityUpdateSummary?: string | null;
};

export function CheckInCard({ checkIn, identityUpdateSummary }: CheckInCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-400">
        {new Date(checkIn.created_at).toLocaleString()}
      </p>

      <p className="mt-2 line-clamp-1 text-sm text-zinc-900">{checkIn.reflection}</p>

      {checkIn.theme_changes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {checkIn.theme_changes.map((change) => {
            const isDifficult = isDifficultCheckInTheme(change.theme);
            return (
              <span
                key={`${change.theme}-${change.direction}`}
                className={
                  isDifficult
                    ? "rounded-full bg-[var(--state-contradiction-detected)]/15 px-2.5 py-1 text-label text-[var(--state-contradiction-detected)]"
                    : "rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-label text-ink-secondary"
                }
              >
                {change.theme} · {change.direction}
              </span>
            );
          })}
        </div>
      ) : null}

      {identityUpdateSummary ? (
        <p className="mt-2 text-sm text-ink-secondary">{identityUpdateSummary}</p>
      ) : null}
    </article>
  );
}
