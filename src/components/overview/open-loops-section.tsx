import Link from "next/link";

import { CheckInPromptCard } from "@/components/homepage/check-in-prompt-card";
import { IdentityPromptCard } from "@/components/identity-prompts/identity-prompt-card";
import type { IdentityPrompt, Moment } from "@/types/database";

import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type CheckInLoop = {
  moment: Moment;
  hasCheckIns: boolean;
};

type OpenLoopsSectionProps = {
  momentsNeedingCheckIn: CheckInLoop[];
  pendingPrompts: IdentityPrompt[];
};

export function OpenLoopsSection({
  momentsNeedingCheckIn,
  pendingPrompts,
}: OpenLoopsSectionProps) {
  const hasCheckIns = momentsNeedingCheckIn.length > 0;
  const hasPrompts = pendingPrompts.length > 0;
  const isEmpty = !hasCheckIns && !hasPrompts;

  return (
    <OverviewSection
      label="Today"
      title="Open loops"
      description="Check-ins and identity prompts waiting for you"
    >
      {isEmpty ? (
        <OverviewEmptyPanel>
          Choose a path on an active moment to unlock check-ins, or capture a new moment
          to begin.
        </OverviewEmptyPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {momentsNeedingCheckIn.map(({ moment, hasCheckIns: momentHasCheckIns }) => (
            <CheckInPromptCard
              key={moment.id}
              moment={moment}
              hasCheckIns={momentHasCheckIns}
            />
          ))}

          {hasPrompts ? (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-body-small text-ink-secondary">Identity prompts</p>
                <Link
                  href="/identity-prompts"
                  className="text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              {pendingPrompts.map((prompt) => (
                <IdentityPromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </OverviewSection>
  );
}
