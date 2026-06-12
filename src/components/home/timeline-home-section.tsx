import Link from "next/link";

import { LifeStoryContainer } from "@/components/overview/life-story-container";
import { OverviewEmptyPanel } from "@/components/overview/overview-empty-panel";
import { OverviewSection } from "@/components/overview/overview-section";
import type { LifeChapter } from "@/types/database";

type TimelineHomeSectionProps = {
  lifeChapters: LifeChapter[];
};

export function TimelineHomeSection({ lifeChapters }: TimelineHomeSectionProps) {
  return (
    <OverviewSection
      label="Story"
      title="How did I get here?"
      description="Past → Current Self → Future Self"
      viewAllHref="/timeline"
      className="gap-[var(--space-zone)]"
    >
      <div className="flex flex-wrap items-center justify-center gap-3 py-2 text-body-small text-ink-secondary">
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">Past</span>
        <span aria-hidden="true">→</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
          Current Self
        </span>
        <span aria-hidden="true">→</span>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1">
          Future Self
        </span>
      </div>

      {lifeChapters.length === 0 ? (
        <OverviewEmptyPanel>
          Life chapters will appear here once you generate your timeline from situations,
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
