import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import {
  generateMockLifeChapters,
  type MockLifeChapterDraft,
  type TimelineGenerationInput,
} from "@/lib/mock-timeline-generator";

export function timelineContextToGenerationInput(
  context: IdentityContextBundle,
): TimelineGenerationInput {
  return {
    moments: context.timelineMoments ?? [],
    chosenPaths: context.timelineChosenPaths ?? [],
    checkIns: context.timelineCheckIns ?? [],
    identityUpdates: context.timelineIdentityUpdates ?? [],
    futureSelves: context.timelineFutureSelves ?? [],
    contradictions: (context.contradictions ?? []) as TimelineGenerationInput["contradictions"],
    alternateSelves: context.alternateSelves ?? [],
    crossroadSnippets: new Map(Object.entries(context.crossroadSnippets ?? {})),
    currentSelf: context.currentSelf ?? null,
  };
}

export function buildTimelineChapterCandidates(
  context: IdentityContextBundle,
): MockLifeChapterDraft[] {
  return generateMockLifeChapters(timelineContextToGenerationInput(context));
}
