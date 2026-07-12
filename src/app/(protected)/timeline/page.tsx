import Link from "next/link";

import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { ChapterAccordion } from "@/components/timeline/chapter-accordion";
import {
  MonthlyChapter,
  MonthlyChapterPreview,
} from "@/components/timeline/monthly-chapter";
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
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f6] px-6">
        <p className="text-[13px] text-red-600">{result.error}</p>
      </div>
    );
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

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10">
            <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
              Timeline
            </h1>
            <p className="text-[15px] text-[#999999]">
              Your personal evolution, one chapter at a time.
            </p>
          </div>

          {narratives.length === 0 ? (
            <OverviewCard className="px-9 py-14">
              <div className="flex flex-col items-center text-center">
                <p className="text-[15px] font-semibold text-[#111]">
                  No monthly chapters yet.
                </p>
                <p className="mt-2 max-w-[400px] text-[13px] leading-relaxed text-[#999999]">
                  Start situations, choose paths, and check in — your first
                  chapter appears once a month of activity accumulates.
                </p>
                <Link
                  href="/moments/new"
                  className="mt-5 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                >
                  Start with a situation
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
