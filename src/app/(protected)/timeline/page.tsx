import Link from "next/link";

import { TrackView } from "@/components/analytics/track-view";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { ChapterAccordion } from "@/components/timeline/chapter-accordion";
import {
  MonthlyChapter,
  MonthlyChapterPreview,
} from "@/components/timeline/monthly-chapter";
import { PageLoadError } from "@/components/ui/page-load-error";
import { loadMonthlyIdentityNarratives } from "@/lib/monthly-identity-narrative";
import { loadTimelineChapterStories } from "@/lib/timeline-chapter-story-loader";
import type { ChapterStory } from "@/lib/timeline-chapter-story";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { getUserIdentity } from "@/lib/user-identity";

export default async function TimelinePage() {
  const [userIdentity, result, storiesResult, reflectionSummaryResult] =
    await Promise.all([
      getUserIdentity(),
      loadMonthlyIdentityNarratives(),
      loadTimelineChapterStories(),
      getUnansweredReflectionSummary(),
    ]);

  if ("error" in result) {
    return <PageLoadError retryHref="/timeline" message={result.error} />;
  }

  const { narratives } = result;
  // Chapter stories are presentation enrichment: a failed load renders the
  // narrative-only chapter rather than failing the page.
  const storiesByMonth: Map<string, ChapterStory> =
    "error" in storiesResult ? new Map() : storiesResult.storiesByMonth;
  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/timeline"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main id="main-content" className="flex-1 overflow-y-auto">
        <TrackView event="timeline_viewed" />
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10">
            <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
              Timeline
            </h1>
            <p className="text-[15px] text-[#707070]">
              Your personal evolution, one chapter at a time.
            </p>
          </div>

          {narratives.length === 0 ? (
            <OverviewCard className="px-9 py-14">
              <div className="flex flex-col items-center text-center">
                <p className="font-voice text-[22px] font-medium tracking-[-0.3px] text-[#111]">
                  Your first chapter is still being written.
                </p>
                <p className="mt-3 max-w-[440px] text-[13px] leading-relaxed text-[#707070]">
                  Reflection composes a chapter for each month once it has
                  observed enough meaningful change to tell a complete story.
                  The month you&apos;re living now is already gathering
                  material — every situation, check-in, and reflection you
                  record becomes part of it.
                </p>
                <Link
                  href="/moments/new"
                  className="mt-6 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                >
                  Add to this month&apos;s story
                </Link>
              </div>
            </OverviewCard>
          ) : (
            /* Every month is one collapsed chapter card on the rail; the
               accordion opens at most one chapter at a time. */
            <ChapterAccordion
              chapters={narratives.map((narrative) => {
                const story = storiesByMonth.get(narrative.month) ?? null;
                return {
                  month: narrative.month,
                  preview: (
                    <MonthlyChapterPreview narrative={narrative} story={story} />
                  ),
                  full: <MonthlyChapter narrative={narrative} story={story} />,
                };
              })}
            />
          )}
        </div>
      </main>
    </div>
  );
}
