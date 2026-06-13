"use server";

import { runStructuredGeneration } from "@/lib/ai/orchestrator";
import {
  discoveryQuestionOutputSchema,
  type DiscoveryQuestionOutput,
} from "@/lib/ai/schemas/discovery-question";
import {
  MAX_DISCOVERY_QUESTIONS,
  planDiscoveryQuestionSession,
  type PlannedDiscoveryQuestion,
  type SituationGoal,
} from "@/lib/discovery-question-planner";
import { createClient } from "@/lib/supabase/server";

export type DiscoveryQuestionsSource = "ai" | "fallback";

export type GenerateDiscoveryQuestionsResponse = {
  questions: PlannedDiscoveryQuestion[];
  source: DiscoveryQuestionsSource;
};

async function getAuthenticatedUserId(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated." };
  }

  return { userId: user.id };
}

function mapAiQuestionsToPlanned(output: DiscoveryQuestionOutput): PlannedDiscoveryQuestion[] {
  return output.questions.map((item, index) => ({
    id: `ai-${index}-${item.category.toLowerCase()}`,
    question: item.question,
    prompt: item.question,
    reason: item.reason,
    category: item.category,
    priority: 100 - index * 5,
    selectedBecause: item.reason,
    isGeneric: false,
  }));
}

function buildFallbackQuestions(input: {
  situationText: string;
  goal: SituationGoal;
}): PlannedDiscoveryQuestion[] {
  return planDiscoveryQuestionSession(
    {
      title: input.situationText,
      goal: input.goal,
    },
    MAX_DISCOVERY_QUESTIONS,
  );
}

export async function generateDiscoveryQuestionsAction(input: {
  situationText: string;
  goal: SituationGoal;
}): Promise<GenerateDiscoveryQuestionsResponse | { error: string }> {
  const situationText = input.situationText.trim();

  if (!situationText) {
    return { error: "Situation text is required." };
  }

  const auth = await getAuthenticatedUserId();
  if ("error" in auth) {
    return { error: auth.error };
  }

  try {
    const generationResult = await runStructuredGeneration({
      userId: auth.userId,
      profile: "discovery_question",
      promptId: "discovery_question.generate",
      schema: discoveryQuestionOutputSchema,
      overrides: {
        situationText,
        situationGoal: input.goal,
      },
    });

    if (
      !generationResult.ok ||
      generationResult.data.questions.length < 4
    ) {
      return {
        questions: buildFallbackQuestions({ situationText, goal: input.goal }),
        source: "fallback",
      };
    }

    return {
      questions: mapAiQuestionsToPlanned(generationResult.data),
      source: "ai",
    };
  } catch {
    return {
      questions: buildFallbackQuestions({ situationText, goal: input.goal }),
      source: "fallback",
    };
  }
}
