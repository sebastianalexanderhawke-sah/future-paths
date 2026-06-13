import {
  understandSituation,
  type DiscoveryQuestionCategory,
  type SituationUnderstanding,
} from "@/lib/situation-understanding";

export type SituationGoal = "decision" | "forecast";

export type DiscoveryPreviousAnswer = {
  questionId: string;
  question: string;
  category: DiscoveryQuestionCategory;
  answer: string;
};

export type DiscoveryQuestionPlanInput = {
  title: string;
  description?: string;
  goal: SituationGoal;
  previousAnswers?: DiscoveryPreviousAnswer[];
};

export type PlannedDiscoveryQuestion = {
  id: string;
  question: string;
  prompt: string;
  reason: string;
  category: DiscoveryQuestionCategory;
  priority: number;
  selectedBecause: string;
  isGeneric: boolean;
};

export type DiscoveryQuestionAuditItem = {
  question: string;
  category: DiscoveryQuestionCategory;
  reason: string;
  selectedBecause: string;
};

export type DiscoveryQuestionAudit = {
  items: DiscoveryQuestionAuditItem[];
};

export type DiscoveryQuestionMetrics = {
  dynamicQuestionsGenerated: number;
  genericQuestionsUsed: number;
  duplicateQuestionsBlocked: number;
  categoryCoverage: number;
  totalQuestions: number;
  percentages: {
    dynamicQuestionsGenerated: number;
    genericQuestionsUsed: number;
    duplicateQuestionsBlocked: number;
    categoryCoverage: number;
  };
};

export const MIN_DISCOVERY_QUESTIONS = 4;
export const MAX_DISCOVERY_QUESTIONS = 5;

type QuestionTemplate = {
  id: string;
  category: DiscoveryQuestionCategory;
  prompt: string | ((context: TemplateContext) => string);
  reason: string;
  priority: number;
  goals: SituationGoal[];
  categories?: DiscoveryQuestionCategory[];
  requiresSignals?: Partial<Record<keyof SituationUnderstanding["signals"], boolean>>;
  requiresMention?: RegExp[];
  requiresAbsentMention?: RegExp[];
  skipIfAnsweredAbout?: RegExp[];
  skipIfSituationCovers?: RegExp[];
};

type TemplateContext = {
  understanding: SituationUnderstanding;
  previousAnswers: DiscoveryPreviousAnswer[];
  goal: SituationGoal;
};

function pronoun(context: TemplateContext): string {
  return context.understanding.subjectPronoun;
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "relocation-reason",
    category: "Relocation",
    prompt: "What is the biggest reason you're considering moving?",
    reason: "Primary motivation strongly influences path generation.",
    priority: 100,
    goals: ["decision", "forecast"],
    categories: ["Relocation"],
    requiresAbsentMention: [/\b(because|since|due to|reason is|main reason|biggest reason)\b/i],
  },
  {
    id: "relocation-destination",
    category: "Relocation",
    prompt: "Do you already know where you'd move?",
    reason: "A known destination changes what paths are realistic.",
    priority: 90,
    goals: ["decision", "forecast"],
    categories: ["Relocation"],
    requiresSignals: { destination: false },
  },
  {
    id: "relocation-leave-behind",
    category: "Relocation",
    prompt: "What would be hardest to leave behind?",
    reason: "Tradeoffs reveal what the move would cost emotionally and practically.",
    priority: 85,
    goals: ["decision", "forecast"],
    categories: ["Relocation"],
  },
  {
    id: "relocation-timeline",
    category: "Relocation",
    prompt: "How soon would you realistically make this decision?",
    reason: "Timing determines whether waiting, preparing, or acting is the live path.",
    priority: 80,
    goals: ["decision", "forecast"],
    categories: ["Relocation"],
    requiresSignals: { timelineGiven: false },
  },
  {
    id: "relocation-job-link",
    category: "Relocation",
    prompt: "Is the move mainly for a job, lifestyle, or something else?",
    reason: "The driver of relocation separates career paths from personal ones.",
    priority: 75,
    goals: ["decision", "forecast"],
    categories: ["Relocation", "Career"],
    requiresSignals: { job: true, relocation: true },
  },
  {
    id: "relationship-one-on-one",
    category: "Relationships",
    prompt: "Have you spent time together one-on-one?",
    reason: "Private time is a strong signal for how direct a path can be.",
    priority: 100,
    goals: ["decision", "forecast"],
    categories: ["Relationships"],
    requiresSignals: { oneOnOneMentioned: false },
  },
  {
    id: "relationship-single",
    category: "Relationships",
    prompt: (context) => `Do you know if ${pronoun(context)}'s single?`,
    reason: "Relationship status changes the risk profile of direct moves.",
    priority: 95,
    goals: ["decision", "forecast"],
    categories: ["Relationships"],
  },
  {
    id: "relationship-initiation",
    category: "Relationships",
    prompt: (context) => `Who usually starts conversations with ${pronoun(context)}?`,
    reason: "Initiation patterns help distinguish interest from politeness.",
    priority: 90,
    goals: ["decision", "forecast"],
    categories: ["Relationships"],
    requiresSignals: { initiationMentioned: false },
  },
  {
    id: "relationship-concern",
    category: "Relationships",
    prompt: (context) =>
      context.understanding.signals.workCrush
        ? `What worries you most about asking ${pronoun(context)} out?`
        : "What worries you most about making a move here?",
    reason: "The main fear points to the path the user is trying to avoid.",
    priority: 85,
    goals: ["decision", "forecast"],
    categories: ["Relationships"],
  },
  {
    id: "relationship-signals",
    category: "Relationships",
    prompt: (context) => `What makes you think ${pronoun(context)} may like you back?`,
    reason: "Concrete signals distinguish hopeful paths from friendly ones.",
    priority: 80,
    goals: ["decision", "forecast"],
    categories: ["Relationships"],
  },
  {
    id: "relationship-outside-work",
    category: "Relationships",
    prompt: "Do you interact outside of work hours?",
    reason: "Off-hours contact suggests the connection may extend beyond the workplace.",
    priority: 78,
    goals: ["forecast"],
    categories: ["Relationships"],
    requiresSignals: { workCrush: true },
  },
  {
    id: "career-attraction",
    category: "Career",
    prompt: "What attracts you most about the new role?",
    reason: "Motivation separates growth paths from escape paths.",
    priority: 100,
    goals: ["decision", "forecast"],
    categories: ["Career"],
    requiresSignals: { job: true },
    requiresMention: [/\b(new job|new role|take a|leave my job|switch|change jobs)\b/i],
  },
  {
    id: "career-leave-behind",
    category: "Career",
    prompt: "What would you lose by leaving your current job?",
    reason: "What you'd give up clarifies whether staying is still a live path.",
    priority: 95,
    goals: ["decision"],
    categories: ["Career"],
    requiresSignals: { job: true },
  },
  {
    id: "career-financial-weight",
    category: "Career",
    prompt: "How much of the decision is financial?",
    reason: "Financial weight helps distinguish practical paths from identity-driven ones.",
    priority: 90,
    goals: ["decision", "forecast"],
    categories: ["Career", "Finance"],
    requiresSignals: { job: true },
  },
  {
    id: "career-hiring-stage",
    category: "Career",
    prompt: "How far along is the hiring process?",
    reason: "Process stage determines whether waiting or deciding now is realistic.",
    priority: 88,
    goals: ["decision", "forecast"],
    categories: ["Career"],
    requiresSignals: { interview: true, hiring: true, offer: false },
    requiresMention: [/\b(interview|hiring|application|recruiter|process)\b/i],
  },
  {
    id: "career-offer-status",
    category: "Career",
    prompt: "Have you received an offer or is this still early interest?",
    reason: "Offer status separates negotiation paths from exploratory ones.",
    priority: 86,
    goals: ["decision", "forecast"],
    categories: ["Career"],
    requiresSignals: { offer: false },
    requiresMention: [/\b(job|role|offer|hiring|interview|employer)\b/i],
  },
  {
    id: "career-offer-likelihood",
    category: "Career",
    prompt: "How likely is the offer to happen?",
    reason: "Probability of an offer changes how aggressively to prepare for a yes or no.",
    priority: 84,
    goals: ["decision", "forecast"],
    categories: ["Career"],
    requiresSignals: { offer: true },
  },
  {
    id: "career-network",
    category: "Career",
    prompt: "Do you know anyone at the company or in that city?",
    reason: "Existing ties change how isolating or supported a move would feel.",
    priority: 82,
    goals: ["forecast"],
    categories: ["Career", "Relocation"],
    requiresSignals: { relocation: true, job: true },
  },
  {
    id: "business-customers",
    category: "Business",
    prompt: "Do you already have customers?",
    reason: "Existing demand separates launch-ready paths from idea-stage ones.",
    priority: 100,
    goals: ["decision", "forecast"],
    categories: ["Business"],
    requiresSignals: { customers: false },
  },
  {
    id: "business-blocker",
    category: "Business",
    prompt: "What's stopping you from launching today?",
    reason: "The main blocker reveals which path is actually in tension.",
    priority: 95,
    goals: ["decision", "forecast"],
    categories: ["Business"],
  },
  {
    id: "business-runway",
    category: "Business",
    prompt: "How much financial runway do you have?",
    reason: "Runway determines how long exploratory paths can stay open.",
    priority: 90,
    goals: ["decision", "forecast"],
    categories: ["Business", "Finance"],
    requiresSignals: { financial: false },
  },
  {
    id: "business-why-now",
    category: "Business",
    prompt: "Why does starting this now matter?",
    reason: "Timing pressure distinguishes urgent launch paths from slow-build ones.",
    priority: 85,
    goals: ["decision"],
    categories: ["Business"],
  },
  {
    id: "business-first-customer",
    category: "Business",
    prompt: "Who would this serve first?",
    reason: "A first audience narrows which business paths are realistic.",
    priority: 82,
    goals: ["forecast"],
    categories: ["Business"],
  },
  {
    id: "education-deadline",
    category: "Education",
    prompt: "When do you need your next step in place?",
    reason: "Deadlines determine whether exploration or commitment paths dominate.",
    priority: 100,
    goals: ["decision", "forecast"],
    categories: ["Education"],
    requiresSignals: { timelineGiven: false },
  },
  {
    id: "education-options",
    category: "Education",
    prompt: "Which paths are you actually considering?",
    reason: "Named options distinguish parallel futures from vague uncertainty.",
    priority: 95,
    goals: ["decision"],
    categories: ["Education"],
  },
  {
    id: "education-priority",
    category: "Education",
    prompt: "What matters most in the next year?",
    reason: "Priorities reveal which post-graduation path fits the user's values.",
    priority: 90,
    goals: ["decision", "forecast"],
    categories: ["Education"],
  },
  {
    id: "finance-stakes",
    category: "Finance",
    prompt: "What financial outcome would feel like a win?",
    reason: "Success criteria separate conservative paths from ambitious ones.",
    priority: 80,
    goals: ["decision", "forecast"],
    categories: ["Finance"],
  },
  {
    id: "family-impact",
    category: "Family",
    prompt: "Who would this affect most?",
    reason: "Affected relationships reveal hidden constraints on each path.",
    priority: 85,
    goals: ["decision", "forecast"],
    categories: ["Family"],
    requiresSignals: { family: true },
  },
  {
    id: "health-concern",
    category: "Health",
    prompt: "What outcome are you hoping for with your health?",
    reason: "Desired outcomes distinguish treatment, maintenance, and avoidance paths.",
    priority: 85,
    goals: ["decision", "forecast"],
    categories: ["Health"],
  },
  {
    id: "custom-outcome",
    category: "Custom",
    prompt: "What result would feel like a win?",
    reason: "A clear win condition anchors path generation to the user's goal.",
    priority: 40,
    goals: ["decision", "forecast"],
  },
  {
    id: "custom-constraints",
    category: "Custom",
    prompt: "What limits your options right now?",
    reason: "Constraints reveal which paths are realistically available.",
    priority: 35,
    goals: ["decision", "forecast"],
  },
  {
    id: "custom-stakes",
    category: "Custom",
    prompt: "What is at stake if this goes wrong?",
    reason: "Downside risk helps distinguish cautious paths from bold ones.",
    priority: 30,
    goals: ["decision", "forecast"],
  },
  {
    id: "custom-timing-decision",
    category: "Custom",
    prompt: "When do you need to decide?",
    reason: "Decision timing helps distinguish urgent paths from open-ended ones.",
    priority: 32,
    goals: ["decision"],
  },
  {
    id: "custom-happened",
    category: "Custom",
    prompt: "What has already happened?",
    reason: "Existing facts prevent paths that ignore what is already true.",
    priority: 45,
    goals: ["forecast"],
  },
  {
    id: "custom-timeline",
    category: "Custom",
    prompt: "What timeline are you working within?",
    reason: "Timing shapes which futures are imminent versus distant.",
    priority: 38,
    goals: ["forecast"],
    requiresSignals: { timelineGiven: false },
  },
];

function resolvePrompt(template: QuestionTemplate, context: TemplateContext): string {
  return typeof template.prompt === "function" ? template.prompt(context) : template.prompt;
}

function normalizeQuestionKey(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function answerText(previousAnswers: DiscoveryPreviousAnswer[]): string {
  return previousAnswers
    .map((entry) => `${entry.question}\n${entry.answer}`)
    .join("\n")
    .toLowerCase();
}

function isDuplicateQuestion(
  template: QuestionTemplate,
  prompt: string,
  previousAnswers: DiscoveryPreviousAnswer[],
): boolean {
  const key = normalizeQuestionKey(prompt);

  return previousAnswers.some((entry) => {
    if (entry.questionId === template.id) {
      return true;
    }

    return normalizeQuestionKey(entry.question) === key;
  });
}

function isTopicAlreadyAnswered(
  template: QuestionTemplate,
  previousAnswers: DiscoveryPreviousAnswer[],
): boolean {
  if (!template.skipIfAnsweredAbout || previousAnswers.length === 0) {
    return false;
  }

  const combinedAnswers = answerText(previousAnswers);
  return template.skipIfAnsweredAbout.some((pattern) => pattern.test(combinedAnswers));
}

function templateMatchesSituation(template: QuestionTemplate, context: TemplateContext): boolean {
  const { understanding } = context;
  const text = understanding.normalizedText;

  if (template.categories && !template.categories.includes(understanding.primaryCategory)) {
    const secondaryCategories = (Object.entries(understanding.categoryScores) as Array<
      [DiscoveryQuestionCategory, number]
    >)
      .filter(([, score]) => score > 0)
      .map(([category]) => category);

    if (!template.categories.some((category) => secondaryCategories.includes(category))) {
      return false;
    }
  }

  if (template.requiresMention && !template.requiresMention.some((pattern) => pattern.test(text))) {
    return false;
  }

  if (
    template.requiresAbsentMention &&
    template.requiresAbsentMention.some((pattern) => pattern.test(text))
  ) {
    return false;
  }

  if (template.requiresSignals) {
    for (const [signal, expected] of Object.entries(template.requiresSignals) as Array<
      [keyof SituationUnderstanding["signals"], boolean]
    >) {
      if (understanding.signals[signal] !== expected) {
        return false;
      }
    }
  }

  if (
    template.skipIfSituationCovers &&
    template.skipIfSituationCovers.some((pattern) => pattern.test(text))
  ) {
    return false;
  }

  return true;
}

function buildSelectedBecause(
  template: QuestionTemplate,
  understanding: SituationUnderstanding,
): string {
  if (template.category === "Custom") {
    return "No category-specific question matched the remaining information gaps.";
  }

  if (template.requiresSignals?.offer === true) {
    return "User mentioned an offer, so offer-specific follow-up is relevant.";
  }

  if (template.category === "Relocation" && understanding.signals.relocation) {
    if (template.id === "relocation-reason") {
      return "User mentioned moving cities but no reason was provided.";
    }

    if (template.id === "relocation-destination") {
      return "User mentioned moving but no destination was named.";
    }

    return "Relocation context is present and this detail is still missing.";
  }

  if (template.category === "Relationships" && understanding.signals.relationship) {
    return "Relationship context is present and this detail would distinguish paths.";
  }

  if (template.category === "Business" && understanding.signals.business) {
    return "Business context is present and this detail would distinguish launch paths.";
  }

  if (template.category === "Career" && understanding.signals.job) {
    return "Career context is present and this detail would distinguish decision paths.";
  }

  return `${understanding.primaryCategory} context matched and this question fills a missing detail.`;
}

function scoreTemplate(
  template: QuestionTemplate,
  context: TemplateContext,
  usedCategories: Set<DiscoveryQuestionCategory>,
): number {
  let score = template.priority;

  if (template.category === context.understanding.primaryCategory) {
    score += 20;
  }

  if (!usedCategories.has(template.category)) {
    score += 15;
  } else {
    score -= 25;
  }

  if (template.category === "Custom") {
    score -= 30;
  }

  return score;
}

function filterTemplates(input: DiscoveryQuestionPlanInput, context: TemplateContext): QuestionTemplate[] {
  return QUESTION_TEMPLATES.filter((template) => {
    if (!template.goals.includes(input.goal)) {
      return false;
    }

    if (!templateMatchesSituation(template, context)) {
      return false;
    }

    const prompt = resolvePrompt(template, context);

    if (isDuplicateQuestion(template, prompt, context.previousAnswers)) {
      return false;
    }

    if (isTopicAlreadyAnswered(template, context.previousAnswers)) {
      return false;
    }

    return true;
  });
}

export function planNextDiscoveryQuestion(
  input: DiscoveryQuestionPlanInput,
): PlannedDiscoveryQuestion | null {
  const understanding = understandSituation(input.title, input.description ?? "");
  const previousAnswers = input.previousAnswers ?? [];
  const context: TemplateContext = {
    understanding,
    previousAnswers,
    goal: input.goal,
  };

  const usedCategories = new Set(previousAnswers.map((entry) => entry.category));
  const candidates = filterTemplates(input, context);

  if (candidates.length === 0) {
    return null;
  }

  const ranked = candidates
    .map((template) => ({
      template,
      prompt: resolvePrompt(template, context),
      score: scoreTemplate(template, context, usedCategories),
    }))
    .sort((left, right) => right.score - left.score);

  const selected = ranked[0]!;
  const isGeneric = selected.template.category === "Custom";

  return {
    id: selected.template.id,
    question: selected.prompt,
    prompt: selected.prompt,
    reason: selected.template.reason,
    category: selected.template.category,
    priority: selected.score,
    selectedBecause: buildSelectedBecause(selected.template, understanding),
    isGeneric,
  };
}

export function planDiscoveryQuestionSession(
  input: DiscoveryQuestionPlanInput,
  maxQuestions = MAX_DISCOVERY_QUESTIONS,
): PlannedDiscoveryQuestion[] {
  const session: PlannedDiscoveryQuestion[] = [];
  const previousAnswers: DiscoveryPreviousAnswer[] = [];

  for (let index = 0; index < maxQuestions; index += 1) {
    const next = planNextDiscoveryQuestion({
      ...input,
      previousAnswers,
    });

    if (!next) {
      break;
    }

    session.push(next);
    previousAnswers.push({
      questionId: next.id,
      question: next.question,
      category: next.category,
      answer: `placeholder-answer-${index}`,
    });
  }

  return session;
}

export function countBlockedDuplicateCandidates(input: DiscoveryQuestionPlanInput): number {
  const understanding = understandSituation(input.title, input.description ?? "");
  const previousAnswers = input.previousAnswers ?? [];
  const context: TemplateContext = { understanding, previousAnswers, goal: input.goal };
  let blocked = 0;

  for (const template of QUESTION_TEMPLATES) {
    if (!template.goals.includes(input.goal)) {
      continue;
    }

    if (!templateMatchesSituation(template, context)) {
      continue;
    }

    const prompt = resolvePrompt(template, context);
    if (isDuplicateQuestion(template, prompt, previousAnswers)) {
      blocked += 1;
    }
  }

  return blocked;
}

export function buildDiscoveryQuestionAudit(
  plannedQuestions: PlannedDiscoveryQuestion[],
): DiscoveryQuestionAudit {
  return {
    items: plannedQuestions.map((entry) => ({
      question: entry.question,
      category: entry.category,
      reason: entry.reason,
      selectedBecause: entry.selectedBecause,
    })),
  };
}

export function computeDiscoveryQuestionMetrics(input: {
  plannedQuestions: PlannedDiscoveryQuestion[];
  duplicateQuestionsBlocked: number;
}): DiscoveryQuestionMetrics {
  const { plannedQuestions, duplicateQuestionsBlocked } = input;
  const dynamicQuestionsGenerated = plannedQuestions.filter((entry) => !entry.isGeneric).length;
  const genericQuestionsUsed = plannedQuestions.filter((entry) => entry.isGeneric).length;
  const categoryCoverage = new Set(plannedQuestions.map((entry) => entry.category)).size;
  const totalQuestions = plannedQuestions.length;
  const denominator = duplicateQuestionsBlocked + totalQuestions;

  const round = (count: number, base: number) =>
    base === 0 ? 0 : Math.round((count / base) * 100);

  return {
    dynamicQuestionsGenerated,
    genericQuestionsUsed,
    duplicateQuestionsBlocked,
    categoryCoverage,
    totalQuestions,
    percentages: {
      dynamicQuestionsGenerated: round(dynamicQuestionsGenerated, totalQuestions),
      genericQuestionsUsed: round(genericQuestionsUsed, totalQuestions),
      duplicateQuestionsBlocked: round(duplicateQuestionsBlocked, denominator),
      categoryCoverage: round(categoryCoverage, totalQuestions),
    },
  };
}

export function toContextQuestion(planned: PlannedDiscoveryQuestion): {
  id: string;
  prompt: string;
  category: DiscoveryQuestionCategory;
  reason: string;
  selectedBecause: string;
  isGeneric: boolean;
} {
  return {
    id: planned.id,
    prompt: planned.prompt,
    category: planned.category,
    reason: planned.reason,
    selectedBecause: planned.selectedBecause,
    isGeneric: planned.isGeneric,
  };
}
