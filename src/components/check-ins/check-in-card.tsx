import type { CheckIn } from "@/types/database";

import { isDifficultCheckInTheme } from "@/lib/check-in-themes";

type CheckInCardProps = {
  checkIn: CheckIn;
  identityUpdateSummary?: string | null;
  variant?: "default" | "prominent";
};

export function CheckInCard({
  checkIn,
  identityUpdateSummary,
  variant = "default",
}: CheckInCardProps) {
  const isProminent = variant === "prominent";

  return (
    <article
      className={
        isProminent
          ? "rounded-xl border border-zinc-200 bg-white px-5 py-4"
          : "rounded-lg border border-zinc-200 bg-white px-4 py-3"
      }
    >
      <p className="text-xs text-zinc-500">
        {new Date(checkIn.created_at).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      <p
        className={
          isProminent
            ? "mt-2 text-sm leading-relaxed text-zinc-900"
            : "mt-2 line-clamp-2 text-sm text-zinc-900"
        }
      >
        {checkIn.reflection}
      </p>

      {checkIn.reality_summary ? (
        <p
          className={
            isProminent
              ? "mt-3 text-sm leading-relaxed text-zinc-600"
              : "mt-2 text-sm text-zinc-600 line-clamp-2"
          }
        >
          {checkIn.reality_summary}
        </p>
      ) : null}

      {checkIn.theme_changes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
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
        <p
          className={
            isProminent
              ? "mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700"
              : "mt-2 text-sm text-ink-secondary"
          }
        >
          {identityUpdateSummary}
        </p>
      ) : null}
    </article>
  );
}
