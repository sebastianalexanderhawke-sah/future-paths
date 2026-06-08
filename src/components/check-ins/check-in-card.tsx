import type { CheckIn } from "@/types/database";

type CheckInCardProps = {
  checkIn: CheckIn;
};

export function CheckInCard({ checkIn }: CheckInCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-xs text-zinc-400">
        {new Date(checkIn.created_at).toLocaleString()}
      </p>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Your reflection
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-900">
          {checkIn.reflection}
        </p>
      </div>

      <div className="mt-4 rounded-lg bg-zinc-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Reality summary
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700">
          {checkIn.reality_summary}
        </p>
      </div>

      {checkIn.theme_changes.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {checkIn.theme_changes.map((change) => (
            <span
              key={`${change.theme}-${change.direction}`}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600"
            >
              {change.theme} · {change.direction}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-sm text-zinc-600">
        <span className="font-medium text-zinc-900">Identity impact: </span>
        {checkIn.identity_impact}
      </p>
    </article>
  );
}
