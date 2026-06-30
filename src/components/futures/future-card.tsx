import { TrendIndicator } from "@/components/ui/trend-indicator";
import { getFutureSelfExplanation, getFutureSelfTrend } from "@/lib/future-self-trend";
import type { FutureSelf } from "@/types/database";

type FutureCardProps = {
  futureSelf: FutureSelf;
};

export function FutureCard({ futureSelf }: FutureCardProps) {
  const isFaded = futureSelf.status === "faded";
  const { delta } = getFutureSelfTrend(futureSelf);
  const explanation = isFaded ? null : getFutureSelfExplanation(futureSelf);
  const hasExplanation = explanation !== null;

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-zinc-400">{futureSelf.evidence_strength} identity signal</p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-900">{futureSelf.name}</h3>
      </div>
      {!isFaded ? (
        <div className="shrink-0 text-right">
          <p className="text-xs text-zinc-400">Identity likelihood</p>
          <p className="flex items-center justify-end gap-1 text-sm font-medium text-zinc-900">
            <span>
              {futureSelf.percentage}% <TrendIndicator futureSelf={futureSelf} />
            </span>
            {hasExplanation ? (
              <span aria-hidden="true" className="text-xs text-zinc-400">
                <span className="group-open:hidden">▾</span>
                <span className="hidden group-open:inline">▴</span>
              </span>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Faded</p>
      )}
    </div>
  );

  return (
    <article
      className={`rounded-lg border bg-white p-4 ${
        isFaded ? "border-zinc-200 opacity-70" : "border-zinc-200"
      }`}
    >
      {hasExplanation ? (
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            {header}
          </summary>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            <p className="text-xs font-medium text-zinc-500">Why this identity is emerging</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">{explanation}</p>
          </div>
        </details>
      ) : (
        header
      )}

      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        {futureSelf.summary}
      </p>

      {futureSelf.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {futureSelf.themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >
              {theme}
            </span>
          ))}
        </div>
      ) : null}

      {futureSelf.core_behaviors.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Behavioral patterns</p>
          <ul className="mt-1 space-y-0.5">
            {futureSelf.core_behaviors.map((behavior) => (
              <li key={behavior} className="flex items-start gap-1.5 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-400">•</span>
                {behavior}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {futureSelf.behavioral_evidence.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Evidence from your situations</p>
          <ul className="mt-1 space-y-0.5">
            {futureSelf.behavioral_evidence.map((evidence) => (
              <li key={evidence} className="flex items-start gap-1.5 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-400">✓</span>
                {evidence}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {futureSelf.growth_opportunities.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Growth opportunities</p>
          <ul className="mt-1 space-y-0.5">
            {futureSelf.growth_opportunities.map((opportunity) => (
              <li key={opportunity} className="flex items-start gap-1.5 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-400">→</span>
                {opportunity}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {futureSelf.blind_spots.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Blind spots</p>
          <ul className="mt-1 space-y-0.5">
            {futureSelf.blind_spots.map((blindSpot) => (
              <li key={blindSpot} className="flex items-start gap-1.5 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-400">·</span>
                {blindSpot}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {futureSelf.likely_evolution ? (
        <div className="mt-3 rounded-md bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-medium text-zinc-500">Who this person is becoming</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">
            {futureSelf.likely_evolution}
          </p>
        </div>
      ) : null}
    </article>
  );
}
