import type { CurrentFutureRendering, SimplifiedFutureRendering } from "@/lib/forecast-simplification-experiment";
import { CardShell } from "@/components/ui/card-shell";

type SimplifiedForecastFutureCardProps = {
  future: SimplifiedFutureRendering;
  label?: string;
};

export function SimplifiedForecastFutureCard({
  future,
  label = "Version A (Raw Claude)",
}: SimplifiedForecastFutureCardProps) {
  return (
    <CardShell variant="elevated" className="p-4 sm:p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">{label}</p>
      <h4 className="mt-3 text-h2 text-ink-primary">{future.title}</h4>

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <p className="text-label text-ink-tertiary">Why it might happen</p>
          <p className="mt-1 text-body-small text-ink-secondary">{future.whyItMightHappen}</p>
        </div>

        <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-label text-ink-tertiary">Future impact</p>
          <p className="mt-1 text-body-small text-ink-primary">{future.futureImpact}</p>
        </div>
      </div>
    </CardShell>
  );
}

type CurrentForecastFutureCardProps = {
  future: CurrentFutureRendering;
  label?: string;
};

export function CurrentForecastFutureCard({
  future,
  label,
}: CurrentForecastFutureCardProps) {
  return (
    <CardShell variant="elevated" className="p-4 sm:p-5">
      {label ? (
        <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">{label}</p>
      ) : null}
      <h4 className={`text-h2 text-ink-primary${label ? " mt-3" : ""}`}>{future.title}</h4>

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <p className="text-label text-ink-tertiary">Why it might happen</p>
          <p className="mt-1 text-body-small text-ink-secondary">{future.whyItMightHappen}</p>
          {future.sourceTrace ? (
            <p className="mt-2 text-body-small text-ink-tertiary">{future.sourceTrace}</p>
          ) : null}
        </div>

        <div>
          <p className="text-label text-ink-tertiary">Signals</p>
          <ul className="mt-1 flex flex-col gap-1.5">
            {future.signals.map((signal) => (
              <li key={signal} className="flex gap-2 text-body-small text-ink-secondary">
                <span aria-hidden="true" className="text-ink-tertiary">
                  •
                </span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-label text-ink-tertiary">Future impact</p>
          <p className="mt-1 text-body-small text-ink-primary">{future.futureImpact}</p>
        </div>
      </div>

      {future.expansion ? (
        <details className="mt-3 text-body-small text-ink-secondary">
          <summary className="cursor-pointer text-ink-tertiary hover:text-ink-secondary">
            View full reasoning
          </summary>
          <p className="mt-2 border-t border-[var(--ink-tertiary)]/10 pt-2">{future.expansion}</p>
        </details>
      ) : null}
    </CardShell>
  );
}
