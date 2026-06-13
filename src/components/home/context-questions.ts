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
