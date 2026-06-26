import Link from "next/link";

import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import { CardShell } from "@/components/ui/card-shell";
import type { CurrentSelf } from "@/types/database";

type CurrentSelfHomeSectionProps = {
  currentSelf: CurrentSelf | null;
};

export function CurrentSelfHomeSection({ currentSelf }: CurrentSelfHomeSectionProps) {
  return (
    <OverviewSection
      label="Identity"
      title="Who am I now?"
      viewAllHref={currentSelf ? "/current-self" : undefined}
      viewAllLabel="View full profile →"
    >
      {currentSelf ? (
        <CardShell variant="elevated" className="p-5 sm:p-6">
          <h3 className="text-h2 text-ink-primary">{currentSelf.title}</h3>

          {currentSelf.summary ? (
            <p className="mt-3 text-body text-ink-secondary leading-relaxed">
              {currentSelf.summary}
            </p>
          ) : null}

          {currentSelf.observations.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-1.5 border-t border-zinc-100 pt-4">
              {currentSelf.observations.slice(0, 3).map((trait) => (
                <li key={trait} className="flex gap-2 text-body-small text-ink-secondary">
                  <span className="mt-1 shrink-0 text-ink-tertiary">·</span>
                  <span>{trait}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardShell>
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
