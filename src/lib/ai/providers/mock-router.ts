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
import { generateMockDiscoveryQuestions } from "@/lib/mock-discovery-question-generator";
import { generateMockCurrentSelf } from "@/lib/mock-current-self-generator";
import { generateMockCurrentSelfFromBrief } from "@/lib/mock-current-self-from-brief-generator";
import { generateMockForecast } from "@/lib/mock-forecast-generator";
import { generateMockFutureSelves } from "@/lib/mock-future-self-generator";
import { generateMockIdentityPrompts } from "@/lib/mock-identity-prompt-generator";
import { generateMockIdentityUpdate } from "@/lib/mock-identity-update-generator";
import { generateMockPastAlternativePaths } from "@/lib/mock-past-alternative-path-generator";
import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import {
  timelineContextToGenerationInput,
} from "@/lib/timeline-chapter-candidates";
import { generateMockLifeChapters } from "@/lib/mock-timeline-generator";
import { generateMockMonthlyIdentityNarratives } from "@/lib/mock-monthly-identity-narrative-generator";
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

    case "path_set.audit":
      // Deterministic mock verdict: destination-level convergence needs real
      // reasoning; duplicate direction labels are already caught upstream by
      // the deterministic validator, so the mock reports a clean set.
      return { convergent_pairs: [] };

    case "discovery_question.generate":
      if (!context.moment) {
        throw new Error("Discovery question generation requires moment context.");
      }

      return generateMockDiscoveryQuestions({
        moment: context.moment,
        goal: context.discoveryGoal ?? "decision",
      });

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

    case "forecast.generate":
      if (!context.moment) {
        throw new Error("Forecast generation requires moment context.");
      }

      return generateMockForecast({
        moment: context.moment,
        selectedPath: context.selectedForecastPath
          ? {
              title: context.selectedForecastPath.title,
              description: context.selectedForecastPath.description,
            }
          : null,
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

    case "current_self.generate_from_brief":
      if (!context.identityBrief) {
        throw new Error("Brief-based Current Self generation requires an Identity Brief.");
      }

      return generateMockCurrentSelfFromBrief(context.identityBrief);

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
      if (context.chapterCandidates) {
        return context.chapterCandidates;
      }

      return generateMockLifeChapters(timelineContextToGenerationInput(context));

    case "monthly_identity_narrative.generate":
      return generateMockMonthlyIdentityNarratives(context.monthlyIdentityEvolution ?? []);

    case "reflection_question.evaluate":
      return { should_reflect: false, question: null };

    case "emerging_situation.detect":
      // Deterministic mock verdict: recognizing that entries have drifted to
      // a genuinely different story needs real reasoning, and a fabricated
      // suggestion would prompt the user to split a situation that never
      // split. The mock always reports no new story.
      return {
        new_story_detected: false,
        confidence: "low",
        suggested_title: null,
        suggested_description: null,
      };

    default:
      throw new Error(`Unsupported prompt id: ${promptId satisfies never}`);
  }
}
