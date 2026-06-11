import Link from "next/link";

import { MomentCard } from "@/components/moments/moment-card";
import type { Moment } from "@/types/database";

import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type MomentsSectionProps = {
  activeMoments: Moment[];
};

export function MomentsSection({ activeMoments }: MomentsSectionProps) {
  return (
    <OverviewSection
      label="Story"
      title="What is shaping me?"
      description="Active moments"
      viewAllHref="/moments"
    >
      {activeMoments.length === 0 ? (
        <OverviewEmptyPanel>
          No active moments yet.{" "}
          <Link
            href="/moments/new"
            className="mt-4 inline-block text-ink-primary underline-offset-4 hover:underline"
          >
            Capture your first moment
          </Link>
        </OverviewEmptyPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {activeMoments.map((moment) => (
            <MomentCard key={moment.id} moment={moment} />
          ))}
        </div>
      )}
    </OverviewSection>
  );
}
