import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";

type MonthlyIdentityNarrativeCardProps = {
  narrative: MonthlyIdentityNarrative;
};

export function MonthlyIdentityNarrativeCard({ narrative }: MonthlyIdentityNarrativeCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6">
      <p className="text-xs text-zinc-400">{narrative.month}</p>
      <h3 className="mt-1 text-lg font-semibold text-zinc-900">{narrative.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{narrative.summary}</p>

      {narrative.comparison &&
      narrative.previousMonth &&
      (narrative.comparison.increased.length > 0 || narrative.comparison.decreased.length > 0) ? (
        <div className="mt-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Compared to {narrative.previousMonth.split(" ")[0]}
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm">
            {narrative.comparison.increased.map((label) => (
              <li key={`increased-${label}`} className="text-emerald-600">
                ↑ {label}
              </li>
            ))}
            {narrative.comparison.decreased.map((label) => (
              <li key={`decreased-${label}`} className="text-rose-600">
                ↓ {label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {narrative.themes.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">Themes</h4>
          <p className="mt-1.5 text-sm text-zinc-700">{narrative.themes.join(" • ")}</p>
        </div>
      ) : null}

      {narrative.majorDecisions.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Major decisions
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-zinc-700">
            {narrative.majorDecisions.map((decision) => (
              <li key={decision}>• {decision}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {narrative.futureShifts.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Future shifts
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm">
            {narrative.futureShifts.map((shift) => (
              <li
                key={shift.futureName}
                className={shift.delta > 0 ? "text-emerald-600" : "text-rose-600"}
              >
                {shift.delta > 0 ? "↑" : "↓"} {shift.futureName} ({shift.delta > 0 ? "+" : ""}
                {shift.delta})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {narrative.identityChanges.length > 0 ? (
        <div className="mt-5">
          <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Identity changes
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-zinc-700">
            {narrative.identityChanges.map((change) => (
              <li key={change}>• {change}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
