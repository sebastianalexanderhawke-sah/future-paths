import Link from "next/link";

import { formatRelativeTime } from "@/lib/relative-time";
import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import { CardShell } from "@/components/ui/card-shell";
import { ThemeChip } from "@/components/ui/theme-chip";
import type { CurrentSelf } from "@/types/database";

type CurrentSelfHomeSectionProps = {
  currentSelf: CurrentSelf | null;
};

// Homepage shows only the headline, top themes, and last-updated time — a
// preview, not the profile. The full summary paragraph lives on /current-self.
export function CurrentSelfHomeSection({ currentSelf }: CurrentSelfHomeSectionProps) {
  return (
    <OverviewSection
      label="Identity"
      title="Who am I now?"
      viewAllHref={currentSelf ? "/current-self" : undefined}
      viewAllLabel="View full profile"
    >
      {currentSelf ? (
        <CardShell variant="elevated" className="p-4 sm:p-5">
          <h3 className="text-h2 text-ink-primary">{currentSelf.headline}</h3>
          {currentSelf.themes.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentSelf.themes.slice(0, 3).map((theme) => (
                <ThemeChip key={theme} theme={theme} />
              ))}
            </div>
          ) : null}
          <p className="mt-2 text-label text-ink-tertiary">
            Last updated {formatRelativeTime(currentSelf.updated_at)}
          </p>
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
