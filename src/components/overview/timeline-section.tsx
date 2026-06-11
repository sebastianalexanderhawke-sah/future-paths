import Link from "next/link";

import type { LifeChapter } from "@/types/database";

import { LifeStoryContainer } from "./life-story-container";
import { OverviewEmptyPanel } from "./overview-empty-panel";
import { OverviewSection } from "./overview-section";

type TimelineSectionProps = {
  lifeChapters: LifeChapter[];
};

export function TimelineSection({ lifeChapters }: TimelineSectionProps) {
  return (
    <OverviewSection
      label="Story"
      title="Your story so far"
      description="Life story"
      viewAllHref="/timeline"
      className="gap-[var(--space-zone)]"
    >
      {lifeChapters.length === 0 ? (
        <OverviewEmptyPanel>
          Life chapters will appear here once you generate your timeline from moments,
          check-ins, and reflections.{" "}
          <Link
            href="/timeline"
            className="mt-4 inline-block text-ink-primary underline-offset-4 hover:underline"
          >
            Generate timeline
          </Link>
        </OverviewEmptyPanel>
      ) : (
        <LifeStoryContainer chapters={lifeChapters} />
      )}
    </OverviewSection>
  );
}
