import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import { CardShell } from "@/components/ui/card-shell";
import { TrendIndicator } from "@/components/ui/trend-indicator";
import type { FutureSelf } from "@/types/database";

type FutureSelfHomeSectionProps = {
  futureSelves: FutureSelf[];
};

export function FutureSelfHomeSection({ futureSelves }: FutureSelfHomeSectionProps) {
  return (
    <OverviewSection
      label="Becoming"
      title="Who might I be becoming?"
      viewAllHref={futureSelves.length > 0 ? "/future-selves" : undefined}
    >
      {futureSelves.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {futureSelves.map((futureSelf) => (
            <CardShell key={futureSelf.id} variant="elevated" className="p-4">
              <h3 className="text-body font-medium text-ink-primary">{futureSelf.name}</h3>
              <p className="mt-1.5 text-label text-ink-tertiary">
                {futureSelf.percentage}% <TrendIndicator futureSelf={futureSelf} /> ·{" "}
                {futureSelf.evidence_strength} evidence
              </p>
            </CardShell>
          ))}
        </div>
      ) : (
        <OverviewEmptyPanel>
          Future Selves will appear here as patterns emerge across your situations
          and check-ins.
        </OverviewEmptyPanel>
      )}
    </OverviewSection>
  );
}
