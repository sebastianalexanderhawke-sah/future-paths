import type { DiscoveryQuestionCategory } from "@/lib/situation-understanding";
import {
  MAX_DISCOVERY_QUESTIONS,
  planDiscoveryQuestionSession,
  toContextQuestion,
} from "@/lib/discovery-question-planner";

export type { DiscoveryQuestionCategory, SituationCategory } from "@/lib/situation-understanding";
export { classifySituation, understandSituation } from "@/lib/situation-understanding";
export {
  buildDiscoveryQuestionAudit,
  computeDiscoveryQuestionMetrics,
  countBlockedDuplicateCandidates,
  MAX_DISCOVERY_QUESTIONS,
  MIN_DISCOVERY_QUESTIONS,
  planDiscoveryQuestionSession,
  planNextDiscoveryQuestion,
  toContextQuestion,
} from "@/lib/discovery-question-planner";
export type {
  DiscoveryPreviousAnswer,
  DiscoveryQuestionAudit,
  DiscoveryQuestionAuditItem,
  DiscoveryQuestionMetrics,
  DiscoveryQuestionPlanInput,
  PlannedDiscoveryQuestion,
} from "@/lib/discovery-question-planner";

export type { SituationGoal } from "@/lib/discovery-question-planner";
import type { SituationGoal } from "@/lib/discovery-question-planner";

export type ContextQuestion = {
  id: string;
  prompt: string;
  category?: DiscoveryQuestionCategory;
  reason?: string;
  selectedBecause?: string;
  isGeneric?: boolean;
};

export function selectContextQuestions(
  situationText: string,
  goal: SituationGoal,
): ContextQuestion[] {
  return planDiscoveryQuestionSession(
    {
      title: situationText,
      goal,
    },
    MAX_DISCOVERY_QUESTIONS,
  ).map(toContextQuestion);
}

/**
 * Returns the full question list for any goal — all 5-6 AI-generated questions
 * are shown regardless of whether the user chose "decision" or "forecast".
 */
export function selectQuestionsForGoal(
  questions: ContextQuestion[],
  goal: SituationGoal,
): ContextQuestion[] {
  void goal;
  return questions;
}

/**
 * Assembles the context summary string sent to forecast/crossroad generation.
 * Prepends optional free-text additionalContext before Q&A pairs.
 */
export function buildContextSummary(
  questions: ContextQuestion[],
  answers: Record<string, string>,
  additionalContext?: string,
): string | null {
  const parts: string[] = [];

  if (additionalContext?.trim()) {
    parts.push(additionalContext.trim());
  }

  const qaLines = questions
    .map((question) => {
      const answer = answers[question.id]?.trim();
      if (!answer) {
        return null;
      }
      return `${question.prompt}\n${answer}`;
    })
    .filter((line): line is string => line !== null);

  parts.push(...qaLines);

  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function areAllQuestionsAnswered(
  questions: ContextQuestion[],
  answers: Record<string, string>,
): boolean {
  return questions.every((question) => answers[question.id]?.trim().length > 0);
}

export function getAnsweredQuestionCount(
  questions: ContextQuestion[],
  answers: Record<string, string>,
): number {
  return questions.filter((question) => answers[question.id]?.trim().length > 0).length;
}

export function buildPreviousAnswersFromSession(
  questions: ContextQuestion[],
  answers: Record<string, string>,
): import("@/lib/discovery-question-planner").DiscoveryPreviousAnswer[] {
  return questions
    .map((question) => {
      const answer = answers[question.id]?.trim();
      if (!answer) {
        return null;
      }

      return {
        questionId: question.id,
        question: question.prompt,
        category: question.category ?? "Custom",
        answer,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}
