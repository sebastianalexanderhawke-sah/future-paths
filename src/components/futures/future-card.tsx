import { TrendIndicator } from "@/components/ui/trend-indicator";
import type { FutureSelf } from "@/types/database";

type FutureCardProps = {
  futureSelf: FutureSelf;
};

/**
 * Returns everything that contributed to this identity — situations,
 * reflections, and check-ins all flow through moments, so supporting
 * situation titles cover all three sources.
 *
 * New-pipeline rows carry real situation titles in supporting_situations.
 * Legacy rows fall back to behavioral_evidence text so nothing disappears.
 */
function getEvidence(futureSelf: FutureSelf): string[] {
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
  const evidence = getEvidence(futureSelf);

  return (
    <article
      className={`rounded-lg border bg-white p-6 ${
        isFaded ? "border-zinc-100 opacity-60" : "border-zinc-100"
      }`}
    >
      {/* Identity: name, percentage, evidence strength */}
      <h3 className="text-[15px] font-semibold leading-snug text-zinc-900">{futureSelf.name}</h3>

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

      {/* Prediction — the primary AI writing: where this identity leads if it
          keeps strengthening. Hidden when faded (a faded identity isn't
          strengthening). */}
      {futureSelf.likely_evolution && !isFaded ? (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Where this is heading</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">
            {futureSelf.likely_evolution}
          </p>
        </div>
      ) : null}

      {/* Core behaviors — capped at 4 so the card doesn't read as 5 strengths
          against a couple of trade-offs */}
      {futureSelf.core_behaviors.length > 0 ? (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Core behaviors</p>
          <ul className="mt-2 space-y-1.5">
            {futureSelf.core_behaviors.slice(0, 4).map((behavior) => (
              <li key={behavior} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-300">·</span>
                {behavior}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* What You Risk — what naturally emerges if this identity becomes dominant */}
      {futureSelf.blind_spots.length > 0 ? (
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">What You Risk</p>
          <ul className="mt-2 space-y-1.5">
            {futureSelf.blind_spots.map((spot) => (
              <li key={spot} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-300">·</span>
                {spot}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Evidence — collapsed by default so the card stays compact */}
      {evidence.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-600">
            Evidence ({evidence.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {evidence.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-zinc-600">
                <span className="mt-0.5 shrink-0 text-zinc-300">—</span>
                {item}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
