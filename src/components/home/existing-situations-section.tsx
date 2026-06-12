import Link from "next/link";

import { MomentCard } from "@/components/moments/moment-card";
import { Button } from "@/components/ui/button";
import type { Moment } from "@/types/database";

import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";

type ExistingSituationsSectionProps = {
  recentSituations: Moment[];
};

export function ExistingSituationsSection({
  recentSituations,
}: ExistingSituationsSectionProps) {
  return (
    <OverviewSection
      label="Situations"
      title="Recent situations"
      description="Pick up where you left off"
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
            <MomentCard key={moment.id} moment={moment} />
          ))}
          <Link
            href="/moments"
            className="self-start text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
          >
            View all situations
          </Link>
        </div>
      )}
    </OverviewSection>
  );
}
