import Link from "next/link";

import { ForecastAuditPanel } from "@/components/home/ai-audit-panel";
import { CurrentForecastFutureCard } from "@/components/home/forecast-simplification-cards";
import {
  formatForecastSituationSummary,
  type ForecastResult,
} from "@/components/home/forecast-utils";
import type { ScannableFuture } from "@/components/home/output-refinement";
import { CardShell } from "@/components/ui/card-shell";
import { toProcessedForecastAudit } from "@/lib/ai-audit";
import {
  groupForecastFutures,
  isStructuredForecastList,
  orderForecastFuturesByConfidence,
} from "@/lib/forecast-order";
import { toCurrentFutureRendering } from "@/lib/forecast-simplification-experiment";

type FutureForecastResultProps = {
  forecast: ForecastResult;
};

type ForecastFutureCardProps = {
  future: ScannableFuture;
  cardVariant?: "elevated" | "wildcard";
};

function ForecastFutureCard({ future, cardVariant = "elevated" }: ForecastFutureCardProps) {
  return (
    <CurrentForecastFutureCard
      future={toCurrentFutureRendering(future)}
      cardVariant={cardVariant}
    />
  );
}

type UnifiedForecastListProps = {
  futures: ScannableFuture[];
  wildCardTitles: Set<string>;
};

function UnifiedForecastList({ futures, wildCardTitles }: UnifiedForecastListProps) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-label text-ink-primary">What might happen next?</p>
      <div className="flex flex-col gap-3">
        {futures.map((future) => (
          <ForecastFutureCard
            key={future.title}
            future={future}
            cardVariant={wildCardTitles.has(future.title) ? "wildcard" : "elevated"}
          />
        ))}
      </div>
    </section>
  );
}

// Phase 3: structured (v3) forecasts render as two labelled groups —
// risks first, then opportunities — each ordered highest-confidence first.
function GroupedForecastList({ futures, wildCardTitles }: UnifiedForecastListProps) {
  const { risks, opportunities } = groupForecastFutures(futures, wildCardTitles);

  return (
    <div className="flex flex-col gap-6">
      {risks.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-label text-ink-primary">Things to Watch For</p>
          <div className="flex flex-col gap-3">
            {risks.map((future) => (
              <ForecastFutureCard key={future.title} future={future} />
            ))}
          </div>
        </section>
      ) : null}

      {opportunities.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="text-label text-ink-primary">Unexpected Opportunities</p>
          <div className="flex flex-col gap-3">
            {opportunities.map((future) => (
              <ForecastFutureCard key={future.title} future={future} cardVariant="wildcard" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function FutureForecastResultView({ forecast }: FutureForecastResultProps) {
  const wildCardFutures = forecast.sections.wildCardFutures ?? [];
  const wildCardTitles = new Set(wildCardFutures.map((future) => future.title));
  const allFutures = orderForecastFuturesByConfidence([
    ...forecast.sections.activeFutures,
    ...forecast.sections.hiddenFutures,
    ...forecast.sections.blindSpotFutures,
    ...wildCardFutures,
  ]);

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
        {isStructuredForecastList(allFutures) ? (
          <GroupedForecastList futures={allFutures} wildCardTitles={wildCardTitles} />
        ) : (
          <UnifiedForecastList futures={allFutures} wildCardTitles={wildCardTitles} />
        )}

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
            pipelineTrace={forecast.audit.pipelineTrace}
            preservationMetrics={forecast.audit.preservationMetrics}
            integrityAudit={forecast.audit.integrityAudit}
            sourceAttribution={forecast.audit.sourceAttribution}
            sourceMetrics={forecast.audit.sourceMetrics}
            explanationAudit={forecast.audit.explanationAudit}
            explanationMetrics={forecast.audit.explanationMetrics}
            simplificationAudit={forecast.audit.simplificationAudit}
            simplificationMetrics={forecast.audit.simplificationMetrics}
          />
        </div>
      ) : null}
    </CardShell>
  );
}
