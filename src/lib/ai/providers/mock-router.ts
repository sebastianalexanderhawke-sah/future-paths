import type {
  CheckIn,
  CurrentSelf,
  FutureSelf,
  IdentityUpdate,
} from "@/types/database";

import { generateMockAlternateSelf } from "@/lib/mock-alternate-self-generator";
import { generateMockCheckIn } from "@/lib/mock-checkin-generator";
import { generateMockContradictions } from "@/lib/mock-contradiction-generator";
import { generateMockCrossroads } from "@/lib/mock-crossroad-generator";
import { generateMockCurrentSelf } from "@/lib/mock-current-self-generator";
import { generateMockFutureSelves } from "@/lib/mock-future-self-generator";
import { generateMockIdentityPrompts } from "@/lib/mock-identity-prompt-generator";
import { generateMockIdentityUpdate } from "@/lib/mock-identity-update-generator";
import { generateMockPastAlternativePaths } from "@/lib/mock-past-alternative-path-generator";
import { generateMockLifeChapters } from "@/lib/mock-timeline-generator";
import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import type { PromptId } from "@/lib/ai/prompts/ids";

function asCurrentSelf(
  value: IdentityContextBundle["currentSelf"],
): CurrentSelf | null {
  if (!value) {
    return null;
  }

  return value as CurrentSelf;
}

function asFutureSelves(
  value: IdentityContextBundle["futureSelves"],
): FutureSelf[] {
  return (value ?? []) as FutureSelf[];
}

export function runMockGenerator(
  promptId: PromptId,
  context: IdentityContextBundle,
): unknown {
  switch (promptId) {
    case "crossroad.generate":
      if (!context.moment) {
        throw new Error("Crossroad generation requires moment context.");
      }

      return generateMockCrossroads(context.moment);

    case "check_in.generate":
      if (!context.moment || !context.chosenPath || !context.reflection) {
        throw new Error("Check-in generation requires moment, path, and reflection.");
      }

      return generateMockCheckIn({
        moment: context.moment,
        path: context.chosenPath,
        reflection: context.reflection,
      });

    case "identity_update.generate":
      if (!context.moment || !context.checkIn) {
        throw new Error("Identity update generation requires moment and check-in context.");
      }

      return generateMockIdentityUpdate({
        moment: context.moment,
        checkIn: context.checkIn,
        priorCheckIns: context.checkInHistory ?? [],
      });

    case "future_self.discover":
      return generateMockFutureSelves({
        momentCount: context.counts?.moments ?? 0,
        checkInCount: context.counts?.checkIns ?? 0,
        pathThemes: context.pathThemes ?? [],
        checkInThemeChanges: (context.checkIns ?? []).flatMap(
          (checkIn) => checkIn.theme_changes ?? [],
        ),
        identityUpdateThemes: (context.identityUpdates ?? []).flatMap(
          (update) => update.themes ?? [],
        ),
      });

    case "current_self.generate":
      return generateMockCurrentSelf({
        momentCount: context.counts?.moments ?? 0,
        checkInCount: context.counts?.checkIns ?? 0,
        activeFutureSelves: asFutureSelves(context.futureSelves),
        pathThemes: context.pathThemes ?? [],
        checkIns: (context.checkIns ?? []) as Pick<
          CheckIn,
          "theme_changes" | "identity_impact"
        >[],
        identityUpdates: (context.identityUpdates ?? []) as Pick<
          IdentityUpdate,
          "title" | "summary" | "themes"
        >[],
      });

    case "identity_prompt.generate":
      return generateMockIdentityPrompts({
        momentCount: context.counts?.moments ?? 0,
        checkInCount: context.counts?.checkIns ?? 0,
        currentSelf: asCurrentSelf(context.currentSelf),
        activeFutureSelves: asFutureSelves(context.futureSelves),
        identityUpdates: context.identityUpdates ?? [],
        pathThemes: context.pathThemes ?? [],
        checkIns: context.checkIns ?? [],
      });

    case "contradiction.detect":
      return generateMockContradictions({
        currentSelf: asCurrentSelf(context.currentSelf),
        activeFutureSelves: asFutureSelves(context.futureSelves),
        answeredResponses: context.answeredPrompts ?? [],
      });

    case "past_path.generate":
      if (!context.pastCrossroad) {
        throw new Error("Past path generation requires past crossroad context.");
      }

      return generateMockPastAlternativePaths(context.pastCrossroad);

    case "alternate_self.generate":
      if (!context.pastCrossroad || !context.selectedPastPath) {
        throw new Error("Alternate self generation requires crossroad and selected path.");
      }

      return generateMockAlternateSelf({
        crossroad: context.pastCrossroad,
        selectedPath: context.selectedPastPath,
      });

    case "timeline.generate":
      return generateMockLifeChapters({
        moments: context.timelineMoments ?? [],
        chosenPaths: context.timelineChosenPaths ?? [],
        checkIns: context.timelineCheckIns ?? [],
        identityUpdates: context.timelineIdentityUpdates ?? [],
        futureSelves: context.timelineFutureSelves ?? [],
        contradictions: (context.contradictions ?? []) as Parameters<
          typeof generateMockLifeChapters
        >[0]["contradictions"],
        alternateSelves: context.alternateSelves ?? [],
        crossroadSnippets: new Map(Object.entries(context.crossroadSnippets ?? {})),
        currentSelf: context.currentSelf ?? null,
      });

    default:
      throw new Error(`Unsupported prompt id: ${promptId satisfies never}`);
  }
}
