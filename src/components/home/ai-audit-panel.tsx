"use client";

import type {
  ForecastExplanationPreservationAudit,
  ForecastExplanationPreservationItem,
  ForecastExplanationPreservationMetrics,
  ForecastSimplificationAudit,
  ForecastSimplificationItem,
  ForecastSimplificationMetrics,
  ForecastIntegrityAudit,
  ForecastPipelineTrace,
  ForecastPipelineTraceItem,
  ForecastSourceAttribution,
  ForecastSourceAttributionAudit,
  ForecastSourceMetrics,
  PathTextFieldTrace,
  PathTextTransformationAudit,
  PathTextTransformationMetrics,
  FutureShiftPreservationAudit,
  FutureShiftPreservationMetrics,
  FutureShiftAuditItem,
  PreservationMetrics,
  ProcessedForecastAudit,
  ProcessedPathAudit,
  RawForecastAudit,
  RawPathAudit,
} from "@/lib/ai-audit";
import { isAiAuditEnabled } from "@/lib/ai-audit";
import { formatIntegrityScore } from "@/lib/forecast-slot-integrity";
import {
  CurrentForecastFutureCard,
  SimplifiedForecastFutureCard,
} from "@/components/home/forecast-simplification-cards";
import type { PathTitleTraceItem } from "@/components/home/path-titles";
import { CardShell } from "@/components/ui/card-shell";

function AuditJsonBlock({ label, data }: { label: string; data: unknown }) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-amber-500/30 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">{label}</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-ink-secondary">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

type AiAuditShellProps = {
  title: string;
  children: React.ReactNode;
};

export function AiAuditShell({ title, children }: AiAuditShellProps) {
  if (!isAiAuditEnabled()) {
    return null;
  }

  return (
    <CardShell
      variant="elevated"
      className="border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4 sm:p-5"
    >
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Developer Audit — {title}
      </p>
      <p className="mt-1 text-body-small text-ink-tertiary">
        Compare raw AI output with post-processed display output. Visible only when{" "}
        <code className="font-mono text-[11px]">NEXT_PUBLIC_AI_AUDIT=true</code>.
      </p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </CardShell>
  );
}

type DecisionSimulatorAuditPanelProps = {
  rawPaths: RawPathAudit[];
  processedPaths: ProcessedPathAudit[];
  pathTitleTraces?: PathTitleTraceItem[];
  textTransformationAudit?: PathTextTransformationAudit;
  textTransformationMetrics?: PathTextTransformationMetrics;
  futureShiftAudit?: FutureShiftPreservationAudit;
  futureShiftMetrics?: FutureShiftPreservationMetrics;
};

function PreservationMetricsBlock({ metrics }: { metrics: PreservationMetrics }) {
  return (
    <AuditJsonBlock label="Preservation Metrics" data={metrics} />
  );
}

function PathTextTransformationMetricsBlock({
  metrics,
}: {
  metrics: PathTextTransformationMetrics;
}) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-amber-500/30 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Text Transformation Metrics
      </p>
      <div className="mt-3 grid gap-1 font-mono text-[11px] text-ink-secondary">
        <p>Preserved Fields: {metrics.preservedFields} ({metrics.percentages.preserved}%)</p>
        <p>Modified Fields: {metrics.modifiedFields} ({metrics.percentages.modified}%)</p>
        <p>Corrupted Fields: {metrics.corruptedFields} ({metrics.percentages.corrupted}%)</p>
        <p>Appended Fields: {metrics.appendedFields} ({metrics.percentages.appended}%)</p>
        <p>Truncated Fields: {metrics.truncatedFields} ({metrics.percentages.truncated}%)</p>
        <p>
          Bypassed Refinements: {metrics.bypassedRefinements} (
          {metrics.percentages.bypassedRefinements}%)
        </p>
        <p>
          Rewritten Refinements: {metrics.rewrittenRefinements} (
          {metrics.percentages.rewrittenRefinements}%)
        </p>
        <p>
          Corrupted Refinements: {metrics.corruptedRefinements} (
          {metrics.percentages.corruptedRefinements}%)
        </p>
      </div>
    </div>
  );
}

function FutureShiftPreservationMetricsBlock({
  metrics,
}: {
  metrics: FutureShiftPreservationMetrics;
}) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-amber-500/30 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Future Shift Metrics
      </p>
      <div className="mt-3 grid gap-1 font-mono text-[11px] text-ink-secondary">
        <p>
          Preserved Future Shifts: {metrics.preservedFutureShifts} (
          {metrics.percentages.preservedFutureShifts}%)
        </p>
        <p>
          Rewritten Future Shifts: {metrics.rewrittenFutureShifts} (
          {metrics.percentages.rewrittenFutureShifts}%)
        </p>
        <p>
          Fallback Future Shifts: {metrics.fallbackFutureShifts} (
          {metrics.percentages.fallbackFutureShifts}%)
        </p>
      </div>
    </div>
  );
}

function FutureShiftPreservationItemView({ item }: { item: FutureShiftAuditItem }) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] font-medium text-ink-primary">
        Path {item.pathIndex + 1}: {item.pathTitle}
      </p>
      <div className="mt-3 grid gap-2 font-mono text-[11px] text-ink-secondary">
        <p>
          <span className="text-ink-tertiary">Raw Future Shift</span>
          <span className="mt-1 block whitespace-pre-wrap">{item.rawFutureShift || "—"}</span>
        </p>
        <p>
          <span className="text-ink-tertiary">Validation Result</span>{" "}
          {item.validationResult.valid
            ? "Valid"
            : `Invalid (${item.validationResult.reason ?? "unknown"})`}
        </p>
        <p>
          <span className="text-ink-tertiary">Displayed Future Shift</span>
          <span className="mt-1 block whitespace-pre-wrap">
            {item.displayedFutureShift || "—"}
          </span>
        </p>
        <p>
          <span className="text-ink-tertiary">Status</span>{" "}
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </p>
      </div>
    </div>
  );
}

function FutureShiftPreservationSection({
  audit,
}: {
  audit: FutureShiftPreservationAudit;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[var(--ink-tertiary)]/10 pt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Future Shift Preservation
      </p>
      {audit.paths.map((item) => (
        <FutureShiftPreservationItemView key={`future-shift-${item.pathIndex}`} item={item} />
      ))}
    </div>
  );
}

function PathTextTransformationTraceItemView({
  field,
}: {
  field: PathTextFieldTrace;
}) {
  const { trace } = field;

  return (
    <div className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] font-medium text-ink-primary">{field.label}</p>
      <div className="mt-3 grid gap-2 font-mono text-[11px] text-ink-secondary">
        <p>
          <span className="text-ink-tertiary">Original</span>
          <span className="mt-1 block whitespace-pre-wrap">{trace.original || "—"}</span>
        </p>
        <p>
          <span className="text-ink-tertiary">After Refinement</span>
          <span className="mt-1 block whitespace-pre-wrap">{trace.afterRefinement || "—"}</span>
        </p>
        <p>
          <span className="text-ink-tertiary">After Formatting</span>
          <span className="mt-1 block whitespace-pre-wrap">{trace.afterFormatting || "—"}</span>
        </p>
        <p>
          <span className="text-ink-tertiary">Final</span>
          <span className="mt-1 block whitespace-pre-wrap">{trace.final || "—"}</span>
        </p>
        <p>
          <span className="text-ink-tertiary">Status</span>{" "}
          {trace.status.charAt(0).toUpperCase() + trace.status.slice(1)}
        </p>
        {trace.preservedBypass ? (
          <p>
            <span className="text-ink-tertiary">Preserved Bypass</span> Yes
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PathTextTransformationTraceSection({
  audit,
}: {
  audit: PathTextTransformationAudit;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[var(--ink-tertiary)]/10 pt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Text Transformation Trace
      </p>
      {audit.paths.map((pathAudit) => (
        <div key={`text-trace-path-${pathAudit.pathIndex}`} className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-tertiary">
            Path {pathAudit.pathIndex + 1}: {pathAudit.pathTitle}
          </p>
          {pathAudit.fields.map((field, index) => (
            <PathTextTransformationTraceItemView
              key={`text-trace-${pathAudit.pathIndex}-${field.field}-${index}`}
              field={field}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DecisionSimulatorAuditPanel({
  rawPaths,
  processedPaths,
  pathTitleTraces,
  textTransformationAudit,
  textTransformationMetrics,
  futureShiftAudit,
  futureShiftMetrics,
}: DecisionSimulatorAuditPanelProps) {
  if (!isAiAuditEnabled()) {
    return null;
  }

  return (
    <AiAuditShell title="Decision Simulator">
      {pathTitleTraces && pathTitleTraces.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
            Path Title Resolution
          </p>
          {pathTitleTraces.map((trace, index) => (
            <div
              key={`path-title-trace-${index}`}
              className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3"
            >
              <p className="font-mono text-[11px] font-medium text-ink-primary">
                {trace.processedTitle}
              </p>
              {trace.rawClaudeTitle ? (
                <p className="mt-2 font-mono text-[11px] text-ink-secondary">
                  <span className="text-ink-tertiary">Raw Claude Title</span> {trace.rawClaudeTitle}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[11px] text-ink-secondary">
                <span className="text-ink-tertiary">Validation</span>{" "}
                {trace.validationResult.valid
                  ? "Valid"
                  : `Invalid (${trace.validationResult.reason ?? "unknown"})`}
              </p>
              <p className="mt-1 font-mono text-[11px] text-ink-secondary">
                <span className="text-ink-tertiary">Fallback</span>{" "}
                {trace.fallbackTitle ?? "—"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-ink-secondary">
                <span className="text-ink-tertiary">Final Displayed Title</span>{" "}
                {trace.processedTitle}
              </p>
              <p className="mt-1 font-mono text-[11px] text-ink-secondary">
                <span className="text-ink-tertiary">Status</span> {trace.status}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {futureShiftMetrics ? (
        <FutureShiftPreservationMetricsBlock metrics={futureShiftMetrics} />
      ) : null}

      {futureShiftAudit ? <FutureShiftPreservationSection audit={futureShiftAudit} /> : null}

      {textTransformationMetrics ? (
        <PathTextTransformationMetricsBlock metrics={textTransformationMetrics} />
      ) : null}

      {textTransformationAudit ? (
        <PathTextTransformationTraceSection audit={textTransformationAudit} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AuditJsonBlock label="Raw AI Paths" data={rawPaths} />
        <AuditJsonBlock label="Processed Paths" data={processedPaths} />
      </div>

      <div className="flex flex-col gap-4">
        {rawPaths.map((rawPath, index) => (
          <div key={`path-audit-${index}`} className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-tertiary">
              Path {index + 1}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              <AuditJsonBlock label="Raw" data={rawPath} />
              <AuditJsonBlock label="Processed" data={processedPaths[index] ?? null} />
            </div>
          </div>
        ))}
      </div>
    </AiAuditShell>
  );
}

type ForecastAuditPanelProps = {
  rawForecast: RawForecastAudit;
  processedForecast: ProcessedForecastAudit;
  pipelineTrace?: ForecastPipelineTrace;
  preservationMetrics?: PreservationMetrics;
  integrityAudit?: ForecastIntegrityAudit;
  sourceAttribution?: ForecastSourceAttributionAudit;
  sourceMetrics?: ForecastSourceMetrics;
  explanationAudit?: ForecastExplanationPreservationAudit;
  explanationMetrics?: ForecastExplanationPreservationMetrics;
  simplificationAudit?: ForecastSimplificationAudit;
  simplificationMetrics?: ForecastSimplificationMetrics;
};

function ForecastIntegritySection({ integrityAudit }: { integrityAudit: ForecastIntegrityAudit }) {
  return (
    <div className="flex flex-col gap-4 border-t border-[var(--ink-tertiary)]/10 pt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Forecast Slot Integrity
      </p>
      {(["active", "hidden", "blind_spots"] as const).map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-tertiary">
            {section.replace("_", " ")} Integrity Score:{" "}
            {formatIntegrityScore(integrityAudit[section].integrityScore)}
          </p>
          <AuditJsonBlock label={`${section} integrity metrics`} data={integrityAudit[section]} />
          {integrityAudit[section].slots.map((slot, index) => (
            <div
              key={`${section}-integrity-${index}`}
              className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3"
            >
              <p className="font-mono text-[11px] font-medium text-ink-primary">{slot.raw}</p>
              <div className="mt-2 grid gap-1 font-mono text-[11px] text-ink-secondary">
                <p>
                  <span className="text-ink-tertiary">Survived</span> {slot.survived ? "Yes" : "No"}
                </p>
                <p>
                  <span className="text-ink-tertiary">Final Slot</span>{" "}
                  {slot.finalSlot ?? "—"}
                </p>
                <p>
                  <span className="text-ink-tertiary">Replaced</span> {slot.replaced ? "Yes" : "No"}
                </p>
                {slot.replacedBy ? (
                  <p>
                    <span className="text-ink-tertiary">Replaced By</span> {slot.replacedBy}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ForecastExplanationPreservationMetricsBlock({
  metrics,
}: {
  metrics: ForecastExplanationPreservationMetrics;
}) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-amber-500/30 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Forecast Explanation Metrics
      </p>
      <div className="mt-3 grid gap-1 font-mono text-[11px] text-ink-secondary">
        <p>
          Preserved Explanations: {metrics.preservedExplanations} (
          {metrics.percentages.preservedExplanations}%)
        </p>
        <p>
          Reconstructed Explanations: {metrics.reconstructedExplanations} (
          {metrics.percentages.reconstructedExplanations}%)
        </p>
        <p>
          Fallback Explanations: {metrics.fallbackExplanations} (
          {metrics.percentages.fallbackExplanations}%)
        </p>
      </div>
    </div>
  );
}

function ForecastExplanationPreservationItemView({
  item,
}: {
  item: ForecastExplanationPreservationItem;
}) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] font-medium text-ink-primary">
        {item.section.replace("_", " ")} #{item.index + 1}: {item.title}
      </p>
      <div className="mt-3 grid gap-2 font-mono text-[11px] text-ink-secondary">
        <p>
          <span className="text-ink-tertiary">Raw</span>
          <span className="mt-1 block whitespace-pre-wrap">{item.rawExplanation ?? "null"}</span>
        </p>
        <p>
          <span className="text-ink-tertiary">Displayed</span>
          <span className="mt-1 block whitespace-pre-wrap">{item.displayedExplanation}</span>
        </p>
        <p>
          <span className="text-ink-tertiary">Status</span>{" "}
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </p>
      </div>
    </div>
  );
}

function ForecastExplanationPreservationSection({
  audit,
}: {
  audit: ForecastExplanationPreservationAudit;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[var(--ink-tertiary)]/10 pt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Forecast Explanation Preservation
      </p>
      {(["active", "hidden", "blind_spots"] as const).map((section) =>
        audit[section].map((item) => (
          <ForecastExplanationPreservationItemView
            key={`explanation-${section}-${item.index}`}
            item={item}
          />
        )),
      )}
    </div>
  );
}

function ForecastSimplificationMetricsBlock({
  metrics,
}: {
  metrics: ForecastSimplificationMetrics;
}) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-amber-500/30 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Forecast Simplification Metrics
      </p>
      <div className="mt-3 grid gap-1 font-mono text-[11px] text-ink-secondary">
        <p>Raw Claude Characters: {metrics.rawClaudeCharacters}</p>
        <p>Displayed Characters: {metrics.displayedCharacters}</p>
        <p>Signal Characters: {metrics.signalCharacters}</p>
        <p>Trace Characters: {metrics.traceCharacters}</p>
        <p>Display Expansion Ratio: {metrics.displayExpansionRatio}%</p>
        <p>
          Matched Futures: {metrics.matchedFutures} / {metrics.totalDisplayedFutures}
        </p>
      </div>
    </div>
  );
}

function ForecastSimplificationItemView({ item }: { item: ForecastSimplificationItem }) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3">
      <div>
        <p className="font-mono text-[11px] font-medium text-ink-primary">
          {item.section.replace("_", " ")} #{item.index + 1}: {item.displayedTitle}
        </p>
        <div className="mt-2 grid gap-1 font-mono text-[11px] text-ink-secondary">
          <p>
            <span className="text-ink-tertiary">Character Delta</span>{" "}
            {item.characterDelta >= 0 ? `+${item.characterDelta}` : item.characterDelta}
          </p>
          {item.displayExpansionRatio !== null ? (
            <p>
              <span className="text-ink-tertiary">Expansion</span> {item.displayExpansionRatio}%
            </p>
          ) : (
            <p>
              <span className="text-ink-tertiary">Raw Claude Match</span> None
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {item.raw ? (
          <SimplifiedForecastFutureCard future={item.raw} />
        ) : (
          <div className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface-muted)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
              Version A (Raw Claude)
            </p>
            <p className="mt-3 text-body-small text-ink-secondary">
              No matching Claude raw future for this displayed slot.
            </p>
          </div>
        )}
        <CurrentForecastFutureCard future={item.current} label="Version B (Current Display)" />
      </div>
    </div>
  );
}

function ForecastSimplificationExperimentSection({
  audit,
}: {
  audit: ForecastSimplificationAudit;
}) {
  const items = [...audit.active, ...audit.hidden, ...audit.blind_spots];

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--ink-tertiary)]/10 pt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Forecast Simplification Experiment
      </p>
      {items.map((item) => (
        <ForecastSimplificationItemView
          key={`simplification-${item.section}-${item.index}`}
          item={item}
        />
      ))}
    </div>
  );
}

function ForecastSourceMetricsBlock({ metrics }: { metrics: ForecastSourceMetrics }) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-amber-500/30 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Forecast Source Metrics
      </p>
      <div className="mt-3 grid gap-1 font-mono text-[11px] text-ink-secondary">
        <p>Claude Futures Displayed: {metrics.claude} ({metrics.percentages.claude}%)</p>
        <p>Recovery Futures Displayed: {metrics.recovery} ({metrics.percentages.recovery}%)</p>
        <p>Fallback Futures Displayed: {metrics.fallback} ({metrics.percentages.fallback}%)</p>
        <p>Future Self Futures Displayed: {metrics.future_self} ({metrics.percentages.future_self}%)</p>
        <p>Merge Futures Displayed: {metrics.merge} ({metrics.percentages.merge}%)</p>
        <p>Unknown Source Futures Displayed: {metrics.unknown} ({metrics.percentages.unknown}%)</p>
      </div>
    </div>
  );
}

function ForecastSourceAttributionItemView({ item }: { item: ForecastSourceAttribution }) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] font-medium text-ink-primary">{item.title}</p>
      <div className="mt-2 grid gap-1 font-mono text-[11px] text-ink-secondary">
        <p>
          <span className="text-ink-tertiary">Source</span> {item.source}
        </p>
        <p>
          <span className="text-ink-tertiary">Stage</span> {item.sourceStage}
        </p>
        <p>
          <span className="text-ink-tertiary">Original</span> {item.originalTitle ?? "null"}
        </p>
      </div>
    </div>
  );
}

function ForecastSourceAttributionSection({
  sourceAttribution,
}: {
  sourceAttribution: ForecastSourceAttributionAudit;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-[var(--ink-tertiary)]/10 pt-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Forecast Source Attribution
      </p>
      {(["active", "hidden", "blind_spots"] as const).map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-tertiary">
            {section.replace("_", " ")}
          </p>
          {sourceAttribution[section].length > 0 ? (
            sourceAttribution[section].map((item, index) => (
              <ForecastSourceAttributionItemView key={`${section}-source-${index}`} item={item} />
            ))
          ) : (
            <p className="text-body-small text-ink-tertiary">No attributed futures.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function stageLabel(value: string | null | undefined, pass = true): string {
  if (value === undefined) {
    return "—";
  }

  if (!value) {
    return pass ? "✗ Removed" : "✗";
  }

  return pass ? "✓" : value;
}

function ForecastPipelineTraceItemView({ item }: { item: ForecastPipelineTraceItem }) {
  const headline = item.final ?? item.afterRewrite ?? item.afterGrounding ?? item.original;

  return (
    <div className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] font-medium text-ink-primary">{headline}</p>
      <div className="mt-3 grid gap-2 font-mono text-[11px] text-ink-secondary">
        <p>
          <span className="text-ink-tertiary">RAW</span> {stageLabel(item.original)} Present
        </p>
        <p>
          <span className="text-ink-tertiary">Reality Filter</span>{" "}
          {item.afterReality ? "✓ Survived" : item.afterReality === null ? "✗ Removed" : "—"}
          {item.afterReality ? `: ${item.afterReality}` : ""}
        </p>
        <p>
          <span className="text-ink-tertiary">Grounding Filter</span>{" "}
          {item.afterGrounding ? "✓ Survived" : item.afterGrounding === null ? "✗ Removed" : "—"}
          {item.afterGrounding ? `: ${item.afterGrounding}` : ""}
        </p>
        <p>
          <span className="text-ink-tertiary">Rewrite</span>{" "}
          {item.afterRewrite
            ? item.afterRewrite !== item.afterGrounding && item.afterRewrite !== item.original
              ? `→ ${item.afterRewrite}`
              : "✓"
            : "—"}
        </p>
        {item.afterRecovery ? (
          <p>
            <span className="text-ink-tertiary">Recovery</span> → {item.afterRecovery}
          </p>
        ) : null}
        <p>
          <span className="text-ink-tertiary">Final</span>{" "}
          {item.final ? "✓ Displayed" : "✗ Not displayed"}
          {item.final ? `: ${item.final}` : ""}
        </p>
        <p>
          <span className="text-ink-tertiary">Status</span> {item.status}
          {item.generatedBy ? ` (${item.generatedBy})` : ""}
        </p>
        {item.reason ? (
          <p>
            <span className="text-ink-tertiary">Reason</span> {item.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ForecastPipelineTraceSection({ trace }: { trace: ForecastPipelineTrace }) {
  return (
    <div className="flex flex-col gap-4">
      {(["active", "hidden", "blind_spots"] as const).map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-tertiary">
            Pipeline Trace — {section.replace("_", " ")}
          </p>
          {trace[section].length > 0 ? (
            trace[section].map((item, index) => (
              <ForecastPipelineTraceItemView key={`${section}-${index}-${item.original}`} item={item} />
            ))
          ) : (
            <p className="text-body-small text-ink-tertiary">No trace entries.</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function ForecastAuditPanel({
  rawForecast,
  processedForecast,
  pipelineTrace,
  preservationMetrics,
  integrityAudit,
  sourceAttribution,
  sourceMetrics,
  explanationAudit,
  explanationMetrics,
  simplificationAudit,
  simplificationMetrics,
}: ForecastAuditPanelProps) {
  if (!isAiAuditEnabled()) {
    return null;
  }

  return (
    <AiAuditShell title="Future Forecast">
      {preservationMetrics ? <PreservationMetricsBlock metrics={preservationMetrics} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AuditJsonBlock label="Raw Forecast" data={rawForecast} />
        <AuditJsonBlock label="Processed Forecast" data={processedForecast} />
      </div>

      {(["active", "hidden", "blind_spots"] as const).map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-tertiary">
            {section.replace("_", " ")}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <AuditJsonBlock label="Raw" data={rawForecast[section]} />
            <AuditJsonBlock label="Processed" data={processedForecast[section]} />
          </div>

          {rawForecast[section].map((rawFuture, index) => (
            <div key={`${section}-${index}`} className="grid gap-3 lg:grid-cols-2">
              <AuditJsonBlock label={`Raw #${index + 1}`} data={rawFuture} />
              <AuditJsonBlock
                label={`Processed #${index + 1}`}
                data={processedForecast[section][index] ?? null}
              />
            </div>
          ))}
        </div>
      ))}

      {integrityAudit ? <ForecastIntegritySection integrityAudit={integrityAudit} /> : null}

      {explanationMetrics ? (
        <ForecastExplanationPreservationMetricsBlock metrics={explanationMetrics} />
      ) : null}

      {explanationAudit ? (
        <ForecastExplanationPreservationSection audit={explanationAudit} />
      ) : null}

      {simplificationMetrics ? (
        <ForecastSimplificationMetricsBlock metrics={simplificationMetrics} />
      ) : null}

      {simplificationAudit ? (
        <ForecastSimplificationExperimentSection audit={simplificationAudit} />
      ) : null}

      {sourceMetrics ? <ForecastSourceMetricsBlock metrics={sourceMetrics} /> : null}

      {sourceAttribution ? (
        <ForecastSourceAttributionSection sourceAttribution={sourceAttribution} />
      ) : null}

      {pipelineTrace ? (
        <div className="border-t border-[var(--ink-tertiary)]/10 pt-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
            Forecast Pipeline Trace
          </p>
          <div className="mt-4">
            <ForecastPipelineTraceSection trace={pipelineTrace} />
          </div>
        </div>
      ) : null}
    </AiAuditShell>
  );
}
