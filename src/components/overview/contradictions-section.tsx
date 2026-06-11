import type { Contradiction } from "@/types/database";

import { ContradictionPoleBridgeCard } from "./contradiction-pole-bridge-card";
import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type ContradictionsSectionProps = {
  activeContradictions: Contradiction[];
};

export function ContradictionsSection({ activeContradictions }: ContradictionsSectionProps) {
  return (
    <OverviewSection
      label="Identity now"
      title="Internal tensions"
      description="Contradictions in dialogue"
      viewAllHref="/contradictions"
      className="gap-[var(--space-zone)]"
    >
      {activeContradictions.length === 0 ? (
        <OverviewEmptyPanel>
          Identity tensions will appear here after you detect contradictions from your
          current self, futures, and reflections.
        </OverviewEmptyPanel>
      ) : (
        <div className="flex flex-col gap-5">
          {activeContradictions.map((contradiction) => (
            <ContradictionPoleBridgeCard key={contradiction.id} contradiction={contradiction} />
          ))}
        </div>
      )}
    </OverviewSection>
  );
}
