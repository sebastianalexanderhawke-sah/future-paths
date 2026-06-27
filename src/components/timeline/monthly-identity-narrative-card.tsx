import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";

type MonthlyIdentityNarrativeCardProps = {
  narrative: MonthlyIdentityNarrative;
};

export function MonthlyIdentityNarrativeCard({ narrative }: MonthlyIdentityNarrativeCardProps) {
  const { situationCount, checkInCount, reflectionCount } = narrative;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6">
      <p className="text-xs text-zinc-400">{narrative.month}</p>
      <h3 className="mt-1 text-lg font-semibold text-zinc-900">{narrative.headline}</h3>

      <div className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-zinc-600">
        {narrative.openingBeginning ? <p>{narrative.openingBeginning}</p> : null}
        {narrative.openingEnd ? <p>{narrative.openingEnd}</p> : null}
      </div>

      {narrative.howYouChanged.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            How you changed
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-zinc-700">
            {narrative.howYouChanged.map((change) => (
              <li key={change}>• {change}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Evidence</h4>
        <p className="mt-1.5 text-sm text-zinc-600">
          {situationCount} {situationCount === 1 ? "situation" : "situations"} · {checkInCount}{" "}
          {checkInCount === 1 ? "check-in" : "check-ins"} · {reflectionCount}{" "}
          {reflectionCount === 1 ? "reflection" : "reflections"}
        </p>
      </div>
    </article>
  );
}
