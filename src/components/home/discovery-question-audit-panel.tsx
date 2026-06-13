"use client";

import type {
  DiscoveryQuestionAudit,
  DiscoveryQuestionMetrics,
} from "@/lib/discovery-question-planner";
import { isAiAuditEnabled } from "@/lib/ai-audit";
import { AiAuditShell } from "@/components/home/ai-audit-panel";

function DiscoveryQuestionAuditItemView({
  item,
  index,
}: {
  item: DiscoveryQuestionAudit["items"][number];
  index: number;
}) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-[var(--ink-tertiary)]/15 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] font-medium text-ink-primary">
        Question {index + 1}: {item.question}
      </p>
      <div className="mt-3 grid gap-2 font-mono text-[11px] text-ink-secondary">
        <p>
          <span className="text-ink-tertiary">Category</span> {item.category}
        </p>
        <p>
          <span className="text-ink-tertiary">Reason</span> {item.reason}
        </p>
        <p>
          <span className="text-ink-tertiary">Selected Because</span> {item.selectedBecause}
        </p>
      </div>
    </div>
  );
}

function DiscoveryQuestionMetricsBlock({ metrics }: { metrics: DiscoveryQuestionMetrics }) {
  return (
    <div className="rounded-[var(--radius-whisper)] border border-amber-500/30 bg-[var(--surface)] p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
        Discovery Question Metrics
      </p>
      <div className="mt-3 grid gap-1 font-mono text-[11px] text-ink-secondary">
        <p>
          Dynamic Questions Generated: {metrics.dynamicQuestionsGenerated} (
          {metrics.percentages.dynamicQuestionsGenerated}%)
        </p>
        <p>
          Generic Questions Used: {metrics.genericQuestionsUsed} (
          {metrics.percentages.genericQuestionsUsed}%)
        </p>
        <p>
          Duplicate Questions Blocked: {metrics.duplicateQuestionsBlocked} (
          {metrics.percentages.duplicateQuestionsBlocked}%)
        </p>
        <p>
          Category Coverage: {metrics.categoryCoverage} (
          {metrics.percentages.categoryCoverage}%)
        </p>
      </div>
    </div>
  );
}

type DiscoveryQuestionAuditPanelProps = {
  audit: DiscoveryQuestionAudit;
  metrics: DiscoveryQuestionMetrics;
};

export function DiscoveryQuestionAuditPanel({ audit, metrics }: DiscoveryQuestionAuditPanelProps) {
  if (!isAiAuditEnabled()) {
    return null;
  }

  return (
    <AiAuditShell title="Discovery Questions">
      <DiscoveryQuestionMetricsBlock metrics={metrics} />
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">
          Discovery Question Audit
        </p>
        {audit.items.map((item, index) => (
          <DiscoveryQuestionAuditItemView key={`discovery-audit-${index}`} item={item} index={index} />
        ))}
      </div>
    </AiAuditShell>
  );
}
