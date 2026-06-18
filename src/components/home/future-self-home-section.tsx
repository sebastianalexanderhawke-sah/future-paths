import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import { CardShell } from "@/components/ui/card-shell";
import type { FutureSelf } from "@/types/database";
import type { FutureSelfStage } from "@/types/enums";

const STAGE_LABELS: Record<FutureSelfStage, string> = {
  possible: "Possible",
  emerging: "Emerging",
  future_self: "Future self",
};

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {futureSelves.map((futureSelf) => (
            <CardShell key={futureSelf.id} variant="elevated" className="p-4">
              <h3 className="text-body font-medium text-ink-primary">{futureSelf.name}</h3>
              <p className="mt-1.5 text-label text-ink-tertiary">
                Momentum {futureSelf.momentum} · {STAGE_LABELS[futureSelf.stage]}
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
