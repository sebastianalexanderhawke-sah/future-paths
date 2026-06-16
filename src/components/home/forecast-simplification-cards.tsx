import type { CurrentFutureRendering, SimplifiedFutureRendering } from "@/lib/forecast-simplification-experiment";
import type { FutureMovement } from "@/lib/forecast-diff";
import { CardShell } from "@/components/ui/card-shell";
import type { CardShellVariant } from "@/lib/design/tokens";

const MOVEMENT_INDICATOR: Record<FutureMovement, { symbol: string; className: string }> = {
  up: { symbol: "↑", className: "text-emerald-600" },
  down: { symbol: "↓", className: "text-red-400" },
  neutral: { symbol: "−", className: "text-zinc-300" },
  new: { symbol: "↑", className: "text-emerald-600" },
};

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
  movement?: FutureMovement;
  cardVariant?: CardShellVariant;
};

export function CurrentForecastFutureCard({
  future,
  label,
  movement,
  cardVariant = "elevated",
}: CurrentForecastFutureCardProps) {
  const timeframeLabel = future.timeframe ? TIMEFRAME_LABELS[future.timeframe] : undefined;
  const indicator = movement ? MOVEMENT_INDICATOR[movement] : null;

  return (
    <CardShell variant={cardVariant} className="overflow-hidden">
      {label ? (
        <p className="border-b border-[var(--ink-tertiary)]/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-amber-700 sm:px-5">
          {label}
        </p>
      ) : null}

      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 hover:bg-[var(--surface-muted)] sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <h4 className="text-h2 text-ink-primary">{future.title}</h4>
              {indicator ? (
                <span
                  aria-label={movement}
                  className={`shrink-0 font-mono text-[10px] font-semibold leading-none ${indicator.className}`}
                >
                  {indicator.symbol}
                </span>
              ) : null}
            </div>
            {timeframeLabel ? (
              <span className="self-start rounded-full bg-[var(--state-emerging)]/15 px-2.5 py-0.5 text-label text-[var(--state-emerging)]">
                {timeframeLabel}
              </span>
            ) : null}
          </div>
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-sm text-ink-tertiary">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>

        <div className="flex flex-col gap-3 border-t border-[var(--ink-tertiary)]/10 px-4 pb-4 pt-3 sm:px-5">
          {future.signals.length > 0 ? (
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
          ) : null}

          <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
            <p className="text-label text-ink-tertiary">Future impact</p>
            <p className="mt-1 text-body-small text-ink-primary">{future.futureImpact}</p>
          </div>

          <div>
            <p className="text-label text-ink-tertiary">Why this might happen</p>
            <p className="mt-1 text-body-small text-ink-secondary">{future.whyItMightHappen}</p>
          </div>

          {future.expansion ? (
            <details className="text-body-small text-ink-secondary">
              <summary className="cursor-pointer text-ink-tertiary hover:text-ink-secondary">
                View full reasoning
              </summary>
              <p className="mt-2 border-t border-[var(--ink-tertiary)]/10 pt-2">
                {future.expansion}
              </p>
            </details>
          ) : null}
        </div>
      </details>
    </CardShell>
  );
}
