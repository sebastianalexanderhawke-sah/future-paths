import { MomentCard } from "@/components/moments/moment-card";
import { Button } from "@/components/ui/button";
import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import type { Moment } from "@/types/database";

type SituationEnrichment = {
  chosenPathTitle?: string;
  lastCheckIn?: { created_at: string };
  hasForecast: boolean;
};

type ExistingSituationsSectionProps = {
  recentSituations: Moment[];
  enrichments: Record<string, SituationEnrichment>;
};

export function ExistingSituationsSection({
  recentSituations,
  enrichments,
}: ExistingSituationsSectionProps) {
  return (
    <OverviewSection
      label="Situations"
      title="Your situations"
      description="Pick up where you left off"
      viewAllHref={recentSituations.length > 0 ? "/moments" : undefined}
      viewAllLabel="View all situations"
    >
      {recentSituations.length === 0 ? (
        <OverviewEmptyPanel>
          <div className="flex flex-col gap-4">
            <p>You don&apos;t have any saved situations yet.</p>
            <Button href="/situations/new" variant="secondary" className="self-start">
              Create Situation
            </Button>
          </div>
        </OverviewEmptyPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {recentSituations.map((moment) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              chosenPathTitle={enrichments[moment.id]?.chosenPathTitle}
              lastCheckIn={enrichments[moment.id]?.lastCheckIn}
              hasForecast={enrichments[moment.id]?.hasForecast ?? false}
            />
          ))}
        </div>
      )}
    </OverviewSection>
  );
}
