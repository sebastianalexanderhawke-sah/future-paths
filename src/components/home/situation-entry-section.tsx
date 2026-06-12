import { MomentCard } from "@/components/moments/moment-card";
import { Button } from "@/components/ui/button";
import type { Moment } from "@/types/database";

import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";

type SituationEntrySectionProps = {
  recentSituations: Moment[];
};

export function SituationEntrySection({ recentSituations }: SituationEntrySectionProps) {
  return (
    <OverviewSection
      label="Situation"
      title="Your situations"
      description="Recent moments you are working through"
    >
      <div className="flex flex-col gap-4">
        <Button href="/moments/new" variant="secondary" className="self-start">
          New Situation
        </Button>

        {recentSituations.length === 0 ? (
          <OverviewEmptyPanel>
            No situations yet. Start with something on your mind — a decision, a change,
            or a crossroads.
          </OverviewEmptyPanel>
        ) : (
          <div className="flex flex-col gap-3">
            {recentSituations.map((moment) => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </div>
        )}
      </div>
    </OverviewSection>
  );
}
