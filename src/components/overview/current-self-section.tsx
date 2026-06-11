import Link from "next/link";

import type { CurrentSelf } from "@/types/database";

import { IdentityClimatePanel } from "./identity-climate-panel";
import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type CurrentSelfSectionProps = {
  currentSelf: CurrentSelf | null;
};

export function CurrentSelfSection({ currentSelf }: CurrentSelfSectionProps) {
  return (
    <OverviewSection
      label="Identity now"
      title="Who am I today?"
      description="Identity climate"
      viewAllHref={currentSelf ? "/current-self" : undefined}
      className="gap-[var(--space-zone)]"
    >
      {currentSelf ? (
        <IdentityClimatePanel currentSelf={currentSelf} />
      ) : (
        <OverviewEmptyPanel>
          Your current identity summary will appear here once you have moments, check-ins,
          and active Future Selves.{" "}
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
