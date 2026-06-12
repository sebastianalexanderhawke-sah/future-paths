import Link from "next/link";

import { IdentityUpdateCard } from "@/components/identity/identity-update-card";
import { IdentityClimatePanel } from "@/components/overview/identity-climate-panel";
import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import type { CurrentSelf, IdentityUpdate } from "@/types/database";

type CurrentSelfHomeSectionProps = {
  currentSelf: CurrentSelf | null;
  recentChanges: IdentityUpdate[];
};

export function CurrentSelfHomeSection({
  currentSelf,
  recentChanges,
}: CurrentSelfHomeSectionProps) {
  return (
    <OverviewSection
      label="Identity"
      title="Who am I today?"
      description="Current self"
      viewAllHref={currentSelf ? "/current-self" : undefined}
      className="gap-[var(--space-zone)]"
    >
      {currentSelf ? (
        <div className="flex flex-col gap-8">
          <IdentityClimatePanel currentSelf={currentSelf} />

          <section aria-labelledby="recent-changes" className="flex flex-col gap-4">
            <h3 id="recent-changes" className="text-label text-ink-tertiary">
              Recent changes
            </h3>
            {recentChanges.length === 0 ? (
              <OverviewEmptyPanel>
                Meaningful shifts will appear here after check-ins reveal new patterns.
              </OverviewEmptyPanel>
            ) : (
              <div className="flex flex-col gap-3">
                {recentChanges.map((update) => (
                  <IdentityUpdateCard key={update.id} update={update} />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <OverviewEmptyPanel>
          Your current identity summary will appear here once you have situations,
          check-ins, and active futures.{" "}
          <Link
            href="/current-self"
            className="mt-4 inline-block text-ink-primary underline-offset-4 hover:underline"
          >
            Generate current self
          </Link>
        </OverviewEmptyPanel>
      )}
    </OverviewSection>
  );
}
