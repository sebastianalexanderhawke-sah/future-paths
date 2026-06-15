import type { CurrentFutureRendering, SimplifiedFutureRendering } from "@/lib/forecast-simplification-experiment";
import { CardShell } from "@/components/ui/card-shell";

const TIMEFRAME_LABELS: Record<string, string> = {
  days: "Likely within days",
  weeks: "Likely within weeks",
  months: "Likely within months",
  longer_term: "Longer-term",
};

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
  const timeframeLabel = future.timeframe ? TIMEFRAME_LABELS[future.timeframe] : undefined;

  return (
    <CardShell variant="elevated" className="p-4 sm:p-5">
      {label ? (
        <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">{label}</p>
      ) : null}

      <div className={`flex items-start justify-between gap-3${label ? " mt-3" : ""}`}>
        <h4 className="text-h2 text-ink-primary">{future.title}</h4>
        {timeframeLabel ? (
          <span className="shrink-0 rounded-full bg-[var(--state-emerging)]/15 px-2.5 py-0.5 text-label text-[var(--state-emerging)]">
            {timeframeLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <p className="text-label text-ink-tertiary">How You&apos;ll Know</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {future.signals.map((signal) => (
              <span
                key={signal}
                className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-label text-ink-secondary"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-label text-ink-tertiary">Future impact</p>
          <p className="mt-1 text-body-small text-ink-primary">{future.futureImpact}</p>
        </div>
      </div>

      <details className="mt-3 text-body-small text-ink-secondary">
        <summary className="cursor-pointer text-ink-tertiary hover:text-ink-secondary">
          Why this might happen
        </summary>
        <p className="mt-2 border-t border-[var(--ink-tertiary)]/10 pt-2">
          {future.whyItMightHappen}
        </p>
      </details>

      {future.expansion ? (
        <details className="mt-2 text-body-small text-ink-secondary">
          <summary className="cursor-pointer text-ink-tertiary hover:text-ink-secondary">
            View full reasoning
          </summary>
          <p className="mt-2 border-t border-[var(--ink-tertiary)]/10 pt-2">{future.expansion}</p>
        </details>
      ) : null}
    </CardShell>
  );
}
