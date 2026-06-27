import Link from "next/link";

import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import { CardShell } from "@/components/ui/card-shell";
import type { CurrentSelf } from "@/types/database";

type CurrentSelfHomeSectionProps = {
  currentSelf: CurrentSelf | null;
};

export function CurrentSelfHomeSection({ currentSelf }: CurrentSelfHomeSectionProps) {
  const themes = currentSelf?.themes.slice(0, 3) ?? [];

  return (
    <OverviewSection
      label="Identity"
      title="Who am I now?"
      viewAllHref={currentSelf ? "/current-self" : undefined}
      viewAllLabel="View full profile →"
    >
      {currentSelf ? (
        <CardShell variant="elevated" className="p-6 sm:p-8">
          <h3 className="text-h1 text-ink-primary leading-snug">{currentSelf.title}</h3>

          {themes.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-2">
              {themes.map((theme) => (
                <li key={theme} className="text-label text-ink-tertiary">
                  {theme}
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
