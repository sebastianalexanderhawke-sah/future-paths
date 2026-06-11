import { IdentityUpdateCard } from "@/components/identity/identity-update-card";
import type { IdentityUpdate } from "@/types/database";

import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type IdentityUpdatesSectionProps = {
  identityUpdates: IdentityUpdate[];
};

export function IdentityUpdatesSection({ identityUpdates }: IdentityUpdatesSectionProps) {
  return (
    <OverviewSection
      label="Identity now"
      title="What changed?"
      description="Identity updates"
    >
      {identityUpdates.length === 0 ? (
        <OverviewEmptyPanel>
          Meaningful shifts will appear here after check-ins reveal new patterns.
        </OverviewEmptyPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {identityUpdates.map((update) => (
            <IdentityUpdateCard key={update.id} update={update} />
          ))}
        </div>
      )}
    </OverviewSection>
  );
}
