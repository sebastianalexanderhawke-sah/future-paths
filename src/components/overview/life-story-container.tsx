import type { LifeChapter } from "@/types/database";

import { CardShell } from "@/components/ui/card-shell";

import { ChapterProgressionConnector } from "./chapter-progression-connector";
import { LifeStoryChapterPanel } from "./life-story-chapter-panel";

type LifeStoryContainerProps = {
  chapters: LifeChapter[];
};

export function LifeStoryContainer({ chapters }: LifeStoryContainerProps) {
  return (
    <CardShell variant="elevated" className="overflow-hidden">
      <div className="border-b border-[var(--ink-tertiary)]/10 bg-[var(--surface-muted)] px-6 py-5 sm:px-8">
        <p className="text-label text-ink-tertiary">Life story</p>
        <p className="mt-2 max-w-2xl text-body text-ink-secondary">
          Read your identity as chapters in a personal narrative — each period connected
          to the next, grounded in what you have lived and recorded.
        </p>
      </div>

      <div className="flex flex-col px-4 py-6 sm:px-6 sm:py-8">
        {chapters.map((chapter, index) => (
          <div key={chapter.id} className="flex flex-col">
            <LifeStoryChapterPanel chapter={chapter} chapterNumber={index + 1} />
            {index < chapters.length - 1 ? <ChapterProgressionConnector /> : null}
          </div>
        ))}
      </div>
    </CardShell>
  );
}
