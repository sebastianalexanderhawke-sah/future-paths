import Link from "next/link";

import type { FutureSelf } from "@/types/database";

import { FutureSelfGallery } from "./future-self-gallery";
import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type FutureSelvesSectionProps = {
  futureSelves: FutureSelf[];
};

export function FutureSelvesSection({ futureSelves }: FutureSelvesSectionProps) {
  return (
    <OverviewSection
      label="Becoming"
      title="Who am I becoming?"
      description="Versions of you that may be taking shape"
      viewAllHref={futureSelves.length > 0 ? "/future-selves" : undefined}
      className="gap-[var(--space-zone)]"
    >
      {futureSelves.length === 0 ? (
        <OverviewEmptyPanel>
          Future Selves will appear here as patterns emerge across your moments and
          check-ins.{" "}
          <Link
            href="/future-selves"
            className="mt-4 inline-block text-ink-primary underline-offset-4 hover:underline"
          >
            Discover futures
          </Link>
        </OverviewEmptyPanel>
      ) : (
        <div className="rounded-[var(--radius-hero)] bg-[var(--surface-muted)] px-4 py-6 sm:px-6 sm:py-8">
          <p className="mb-6 max-w-2xl text-body text-ink-secondary">
            Each portrait reflects a trajectory — not a prediction, but a direction your
            patterns may be pointing toward.
          </p>
          <FutureSelfGallery futureSelves={futureSelves} />
        </div>
      )}
    </OverviewSection>
  );
}
