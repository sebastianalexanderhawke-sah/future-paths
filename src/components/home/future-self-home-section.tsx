import Link from "next/link";

import { FutureSelfPortraitCard } from "@/components/overview/future-self-portrait-card";
import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import type { FutureSelf } from "@/types/database";

type FutureSelfHomeSectionProps = {
  futureSelf: FutureSelf | null;
};

export function FutureSelfHomeSection({ futureSelf }: FutureSelfHomeSectionProps) {
  return (
    <OverviewSection
      label="Becoming"
      title="Who am I becoming?"
      description="Long-term identity trajectory"
      viewAllHref={futureSelf ? "/future-selves" : undefined}
      className="gap-[var(--space-zone)]"
    >
      {futureSelf ? (
        <div className="flex justify-center">
          <FutureSelfPortraitCard
            futureSelf={futureSelf}
            featured
            className="w-full max-w-[22rem] min-w-0 sm:max-w-[24rem]"
          />
        </div>
      ) : (
        <OverviewEmptyPanel>
          A long-term future self will appear here as patterns emerge across your
          situations and check-ins.{" "}
          <Link
            href="/future-selves"
            className="mt-4 inline-block text-ink-primary underline-offset-4 hover:underline"
          >
            Discover futures
          </Link>
        </OverviewEmptyPanel>
      )}
    </OverviewSection>
  );
}
