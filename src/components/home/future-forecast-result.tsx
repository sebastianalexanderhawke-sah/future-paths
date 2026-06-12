import Link from "next/link";

import { ForecastAuditPanel } from "@/components/home/ai-audit-panel";
import {
  formatForecastSituationSummary,
  type ForecastResult,
} from "@/components/home/forecast-utils";
import type { ScannableFuture } from "@/components/home/output-refinement";
import { CardShell } from "@/components/ui/card-shell";
import { toProcessedForecastAudit } from "@/lib/ai-audit";

type FutureForecastResultProps = {
  forecast: ForecastResult;
};

type ForecastFutureCardProps = {
  future: ScannableFuture;
};

function ForecastFutureCard({ future }: ForecastFutureCardProps) {
  return (
    <CardShell variant="elevated" className="p-4 sm:p-5">
      <h4 className="text-h2 text-ink-primary">{future.title}</h4>

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

type ForecastSectionProps = {
  title: string;
  question: string;
  futures: ScannableFuture[];
  accentClass: string;
};

function ForecastSection({ title, question, futures, accentClass }: ForecastSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className={`text-label ${accentClass}`}>{title}</p>
        <p className="mt-1 text-body-small text-ink-secondary">{question}</p>
      </div>
      <div className="flex flex-col gap-3">
        {futures.map((future) => (
          <ForecastFutureCard key={future.title} future={future} />
        ))}
      </div>
    </section>
  );
}

export function FutureForecastResultView({ forecast }: FutureForecastResultProps) {
  return (
    <CardShell
      variant="hero"
      className="overflow-hidden ring-1 ring-[var(--state-emerging)]/25"
    >
      <div className="border-b border-[var(--ink-tertiary)]/10 bg-[var(--surface-muted)] px-6 py-4 sm:px-8">
        <p className="text-label text-[var(--state-emerging)]">Future Forecast</p>
        <h3 className="mt-1 text-h1 text-ink-primary">{forecast.situationTitle}</h3>
        {forecast.selectedPathTitle ? (
          <p className="mt-2 text-body-small text-[var(--state-strengthened)]">
            Forecasting path: {forecast.selectedPathTitle}
          </p>
        ) : null}
        <p className="mt-2 text-body-small text-ink-secondary">
          {formatForecastSituationSummary(forecast.situationSummary)}
        </p>
        <p className="mt-3 text-body-small text-ink-tertiary">
          Situation saved and tracked for future evolution.
        </p>
      </div>

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <ForecastSection
          title="Active Futures"
          question="What seems most likely to happen next?"
          futures={forecast.sections.activeFutures}
          accentClass="text-[var(--state-strengthened)]"
        />
        <ForecastSection
          title="Hidden Futures"
          question="What future are you probably not considering?"
          futures={forecast.sections.hiddenFutures}
          accentClass="text-[var(--state-emerging)]"
        />
        <ForecastSection
          title="Blind Spot Futures"
          question="What futures emerge from details you provided?"
          futures={forecast.sections.blindSpotFutures}
          accentClass="text-[var(--state-contradiction-detected)]"
        />

        <Link
          href={`/moments/${forecast.momentId}`}
          className="self-start text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
        >
          View tracked situation
        </Link>
      </div>

      {forecast.audit ? (
        <div className="border-t border-[var(--ink-tertiary)]/10 p-4 sm:p-6">
          <ForecastAuditPanel
            rawForecast={forecast.audit.rawForecast}
            processedForecast={toProcessedForecastAudit(forecast.sections)}
          />
        </div>
      ) : null}
    </CardShell>
  );
}
