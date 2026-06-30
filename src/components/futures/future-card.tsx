import { TrendIndicator } from "@/components/ui/trend-indicator";
import type { FutureSelf } from "@/types/database";

type FutureCardProps = {
  futureSelf: FutureSelf;
};

/**
 * Returns the situations that most shaped this identity.
 *
 * New-pipeline rows carry real situation titles in supporting_situations.
 * Legacy rows fall back to behavioral_evidence text so nothing disappears.
 */
function getMoments(futureSelf: FutureSelf): string[] {
  if (futureSelf.supporting_situations?.length) {
    return futureSelf.supporting_situations
      .flatMap((s) => {
        const title = (s as Record<string, unknown>).momentTitle;
        return typeof title === "string" ? [title] : [];
      })
      .slice(0, 5);
  }
  return futureSelf.behavioral_evidence.slice(0, 5);
}

export function FutureCard({ futureSelf }: FutureCardProps) {
  const isFaded = futureSelf.status === "faded";
  const moments = getMoments(futureSelf);

  return (
    <article
      className={`rounded-lg border bg-white p-5 ${
        isFaded ? "border-zinc-200 opacity-60" : "border-zinc-200"
      }`}
    >
      {/* Identity name */}
      <h3 className="text-[15px] font-semibold leading-snug text-zinc-900">{futureSelf.name}</h3>

      {/* Likelihood and evidence strength */}
      {!isFaded ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="font-medium text-zinc-700">{futureSelf.percentage}%</span>
            <TrendIndicator futureSelf={futureSelf} />
          </span>
          <span aria-hidden="true" className="text-zinc-300">·</span>
          <span>{futureSelf.evidence_strength}</span>
        </div>
      ) : (
        <p className="mt-1 text-xs text-zinc-400">Faded</p>
      )}

      {/* Why this identity is emerging — primary narrative */}
      {futureSelf.why_emerging && !isFaded ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-400">Why this identity is emerging</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">
            {futureSelf.why_emerging}
          </p>
        </div>
      ) : null}

      {/* Moments that shaped this identity */}
      {moments.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-400">Moments that shaped this identity</p>
          <ul className="mt-1.5 space-y-1">
            {moments.map((moment) => (
              <li key={moment} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-300">—</span>
                {moment}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Core behaviors */}
      {futureSelf.core_behaviors.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-400">Core behaviors</p>
          <ul className="mt-1.5 space-y-1">
            {futureSelf.core_behaviors.map((behavior) => (
              <li key={behavior} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-300">·</span>
                {behavior}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* What this opens up */}
      {futureSelf.growth_opportunities.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-400">What this opens up</p>
          <ul className="mt-1.5 space-y-1">
            {futureSelf.growth_opportunities.map((opportunity) => (
              <li key={opportunity} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-300">→</span>
                {opportunity}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Blind spots */}
      {futureSelf.blind_spots.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-400">Blind spots</p>
          <ul className="mt-1.5 space-y-1">
            {futureSelf.blind_spots.map((spot) => (
              <li key={spot} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-300">·</span>
                {spot}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* If this continues... */}
      {futureSelf.likely_evolution ? (
        <div className="mt-5 rounded-md bg-zinc-50 px-3 py-2.5">
          <p className="text-xs font-medium text-zinc-400">If this continues...</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
            {futureSelf.likely_evolution}
          </p>
        </div>
      ) : null}
    </article>
  );
}
