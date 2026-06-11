import { describe, expect, it } from "vitest";

import {
  buildTimelineChapterCandidates,
  timelineContextToGenerationInput,
} from "@/lib/timeline-chapter-candidates";
import { generateMockLifeChapters } from "@/lib/mock-timeline-generator";

describe("timeline chapter candidates", () => {
  it("matches generateMockLifeChapters for the same context bundle", () => {
    const context = {
      userId: "user-1",
      profile: "timeline",
      timelineMoments: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "A moment",
          created_at: "2026-06-15T12:00:00.000Z",
          status: "active" as const,
        },
      ],
      timelineChosenPaths: [],
      timelineCheckIns: [
        {
          id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          reflection: "Reflection",
          theme_changes: [{ theme: "Growth" as const, direction: "strengthened" as const }],
          identity_impact: "Impact",
          created_at: "2026-06-16T12:00:00.000Z",
        },
        {
          id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          reflection: "Reflection two",
          theme_changes: [{ theme: "Courage" as const, direction: "emerging" as const }],
          identity_impact: "Impact two",
          created_at: "2026-06-17T12:00:00.000Z",
        },
      ],
      timelineIdentityUpdates: [],
      timelineFutureSelves: [],
      contradictions: [],
      alternateSelves: [],
      crossroadSnippets: {},
    };

    const input = timelineContextToGenerationInput(context);
    const direct = generateMockLifeChapters(input);
    const candidates = buildTimelineChapterCandidates(context);

    expect(candidates).toEqual(direct);
  });

  it("returns an empty candidate list when evidence is insufficient", () => {
    expect(
      buildTimelineChapterCandidates({
        userId: "user-1",
        profile: "timeline",
        timelineMoments: [],
        timelineChosenPaths: [],
        timelineCheckIns: [],
        timelineIdentityUpdates: [],
        timelineFutureSelves: [],
        contradictions: [],
        alternateSelves: [],
        crossroadSnippets: {},
      }),
    ).toEqual([]);
  });
});
