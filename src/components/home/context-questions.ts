export type SituationGoal = "decision" | "forecast";

export type SituationCategory =
  | "job_opportunity"
  | "relationship_work"
  | "graduation"
  | "starting_business"
  | "generic";

export type ContextQuestion = {
  id: string;
  prompt: string;
};

const DECISION_JOB: ContextQuestion[] = [
  { id: "decision-job-likelihood", prompt: "How likely is the offer to happen?" },
  { id: "decision-job-constraints", prompt: "What would relocating require you to leave behind?" },
  { id: "decision-job-relationships", prompt: "Who would this move affect most?" },
  { id: "decision-job-motivation", prompt: "What is pulling you toward taking it?" },
  { id: "decision-job-risk", prompt: "What feels riskiest about saying yes?" },
];

const DECISION_RELATIONSHIP: ContextQuestion[] = [
  { id: "decision-rel-initiate", prompt: "How often does she initiate conversations?" },
  { id: "decision-rel-one-on-one", prompt: "Have you spent time together one-on-one?" },
  { id: "decision-rel-someone-else", prompt: "Do you know if she is interested in someone else?" },
  { id: "decision-rel-signals", prompt: "What makes you think she may like you back?" },
  { id: "decision-rel-concern", prompt: "What concerns you most?" },
];

const FORECAST_JOB: ContextQuestion[] = [
  { id: "forecast-job-stage", prompt: "How far along is the hiring process?" },
  { id: "forecast-job-offer", prompt: "Have you received an offer or just early interest?" },
  { id: "forecast-job-constraints", prompt: "What would you need to rearrange to move?" },
  { id: "forecast-job-network", prompt: "Do you know anyone in that city or company?" },
  { id: "forecast-job-backup", prompt: "What happens if this opportunity falls through?" },
];

const FORECAST_RELATIONSHIP: ContextQuestion[] = [
  { id: "forecast-rel-initiate", prompt: "How often does she initiate conversations?" },
  { id: "forecast-rel-one-on-one", prompt: "Have you spent time together one-on-one?" },
  { id: "forecast-rel-outside-work", prompt: "Do you interact outside of work hours?" },
  { id: "forecast-rel-others", prompt: "Is anyone else involved or interested?" },
  { id: "forecast-rel-concern", prompt: "What outcome worries you most?" },
];

const DECISION_FALLBACK: ContextQuestion[] = [
  { id: "decision-fallback-outcome", prompt: "What result would feel like a win?" },
  { id: "decision-fallback-constraints", prompt: "What limits your options right now?" },
  { id: "decision-fallback-stakes", prompt: "What is at stake if this goes wrong?" },
  { id: "decision-fallback-timing", prompt: "When do you need to decide?" },
];

const FORECAST_FALLBACK: ContextQuestion[] = [
  { id: "forecast-fallback-so-far", prompt: "What has already happened?" },
  { id: "forecast-fallback-forces", prompt: "What forces are already pushing this forward?" },
  { id: "forecast-fallback-blockers", prompt: "What could stop this from happening?" },
  { id: "forecast-fallback-window", prompt: "What timeline are you working within?" },
];

const DECISION_GRADUATION: ContextQuestion[] = [
  { id: "decision-grad-deadline", prompt: "When do you need your next step in place?" },
  { id: "decision-grad-options", prompt: "Which paths are you actually considering?" },
  { id: "decision-grad-priority", prompt: "What matters most in the next year?" },
  { id: "decision-grad-tradeoff", prompt: "What would you regret not trying?" },
  { id: "decision-grad-support", prompt: "Who is affected by what you choose next?" },
];

const FORECAST_GRADUATION: ContextQuestion[] = [
  { id: "forecast-grad-plans", prompt: "What plans are already in motion?" },
  { id: "forecast-grad-uncertainty", prompt: "Which part of life after graduation feels least settled?" },
  { id: "forecast-grad-support", prompt: "Who depends on or influences your next step?" },
  { id: "forecast-grad-timeline", prompt: "What deadlines are coming up?" },
  { id: "forecast-grad-fallback", prompt: "What happens if your first plan does not work out?" },
];

const DECISION_BUSINESS: ContextQuestion[] = [
  { id: "decision-biz-why-now", prompt: "Why does starting this now matter?" },
  { id: "decision-biz-risk", prompt: "What is the biggest downside if this fails?" },
  { id: "decision-biz-readiness", prompt: "What do you already have in place to begin?" },
  { id: "decision-biz-tradeoff", prompt: "What would you need to give up to pursue this?" },
  { id: "decision-biz-success", prompt: "What would make this feel worth the risk?" },
];

const FORECAST_BUSINESS: ContextQuestion[] = [
  { id: "forecast-biz-stage", prompt: "How far along is the idea today?" },
  { id: "forecast-biz-resources", prompt: "What resources or support do you already have?" },
  { id: "forecast-biz-market", prompt: "Who would this serve first?" },
  { id: "forecast-biz-blocker", prompt: "What could slow momentum in the next few months?" },
  { id: "forecast-biz-break", prompt: "What would early traction look like?" },
];

export function classifySituation(situationText: string): SituationCategory {
  const normalized = situationText.toLowerCase();

  if (
    /\b(job|career|offer|interview|relocate|moving|dallas|hire|hired|promotion)\b/.test(
      normalized,
    )
  ) {
    return "job_opportunity";
  }

  if (
    /\b(girl|guy|boy|crush|date|dating|relationship|like.*work|coworker|colleague)\b/.test(
      normalized,
    )
  ) {
    return "relationship_work";
  }

  if (/\b(graduat\w*|college|university|school|degree|diploma)\b/.test(normalized)) {
    return "graduation";
  }

  if (/\b(business|startup|company|found|launch|entrepreneur)\b/.test(normalized)) {
    return "starting_business";
  }

  return "generic";
}

export function selectContextQuestions(
  situationText: string,
  goal: SituationGoal,
): ContextQuestion[] {
  const category = classifySituation(situationText);

  if (goal === "decision") {
    switch (category) {
      case "job_opportunity":
        return DECISION_JOB;
      case "relationship_work":
        return DECISION_RELATIONSHIP;
      case "graduation":
        return DECISION_GRADUATION;
      case "starting_business":
        return DECISION_BUSINESS;
      default:
        return DECISION_FALLBACK;
    }
  }

  switch (category) {
    case "job_opportunity":
      return FORECAST_JOB;
    case "relationship_work":
      return FORECAST_RELATIONSHIP;
    case "graduation":
      return FORECAST_GRADUATION;
    case "starting_business":
      return FORECAST_BUSINESS;
    default:
      return FORECAST_FALLBACK;
  }
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
