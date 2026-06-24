import { TrendIndicator } from "@/components/ui/trend-indicator";
import { getFutureSelfExplanation, getFutureSelfTrend } from "@/lib/future-self-trend";
import type { FutureSelf } from "@/types/database";

type FutureCardProps = {
  futureSelf: FutureSelf;
};

export function FutureCard({ futureSelf }: FutureCardProps) {
  const isFaded = futureSelf.status === "faded";
  const { delta } = getFutureSelfTrend(futureSelf);
  // A faded future doesn't render a percentage row at all (see header below),
  // so it has nothing to disclose. Otherwise any nonzero delta must be
  // explainable — AI-authored when present, deterministic fallback otherwise.
  const explanation = isFaded ? null : getFutureSelfExplanation(futureSelf);
  const hasExplanation = explanation !== null;

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-zinc-400">{futureSelf.evidence_strength} evidence</p>
        <h3 className="mt-1 text-sm font-medium text-zinc-900">{futureSelf.name}</h3>
      </div>
      {!isFaded ? (
        <div className="text-right">
          <p className="text-xs text-zinc-400">Likelihood</p>
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
            <p className="text-xs font-medium text-zinc-500">Why it changed</p>
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

      {futureSelf.benefits.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Benefits</p>
          <ul className="mt-1 list-inside list-disc text-sm text-zinc-600">
            {futureSelf.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {futureSelf.consequences.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Consequences</p>
          <ul className="mt-1 list-inside list-disc text-sm text-zinc-600">
            {futureSelf.consequences.map((consequence) => (
              <li key={consequence}>{consequence}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {futureSelf.prediction ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-zinc-500">Prediction</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">{futureSelf.prediction}</p>
        </div>
      ) : null}
    </article>
  );
}
