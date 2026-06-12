"use client";

import type {
  ProcessedForecastAudit,
  ProcessedPathAudit,
  RawForecastAudit,
  RawPathAudit,
} from "@/lib/ai-audit";
import { isAiAuditEnabled } from "@/lib/ai-audit";
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
};

export function DecisionSimulatorAuditPanel({
  rawPaths,
  processedPaths,
}: DecisionSimulatorAuditPanelProps) {
  if (!isAiAuditEnabled()) {
    return null;
  }

  return (
    <AiAuditShell title="Decision Simulator">
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
};

export function ForecastAuditPanel({
  rawForecast,
  processedForecast,
}: ForecastAuditPanelProps) {
  if (!isAiAuditEnabled()) {
    return null;
  }

  return (
    <AiAuditShell title="Future Forecast">
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
    </AiAuditShell>
  );
}
