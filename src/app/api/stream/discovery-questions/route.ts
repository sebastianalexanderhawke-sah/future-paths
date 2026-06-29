import { createClient } from "@/lib/supabase/server";
import { runStreamingGeneration } from "@/lib/ai/stream";
import { discoveryQuestionOutputSchema } from "@/lib/ai/schemas/discovery-question";
import {
  MAX_DISCOVERY_QUESTIONS,
  planDiscoveryQuestionSession,
  type PlannedDiscoveryQuestion,
  type SituationGoal,
} from "@/lib/discovery-question-planner";

function mapAiQuestions(
  questions: { question: string; category: string; reason: string }[],
): PlannedDiscoveryQuestion[] {
  return questions.map((item, index) => ({
    id: `ai-${index}-${item.category.toLowerCase()}`,
    question: item.question,
    prompt: item.question,
    reason: item.reason,
    category: item.category as PlannedDiscoveryQuestion["category"],
    priority: 100 - index * 5,
    selectedBecause: item.reason,
    isGeneric: false,
  }));
}

function buildFallback(situationText: string, goal: SituationGoal): PlannedDiscoveryQuestion[] {
  return planDiscoveryQuestionSession({ title: situationText, goal }, MAX_DISCOVERY_QUESTIONS);
}

function sseData(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.situationText !== "string" || !body.situationText.trim()) {
    return Response.json({ error: "situationText is required" }, { status: 400 });
  }

  const { situationText, goal, additionalContext } = body as {
    situationText: string;
    goal: SituationGoal;
    additionalContext?: string;
  };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: unknown) =>
        controller.enqueue(encoder.encode(sseData(event)));

      try {
        const generationResult = await runStreamingGeneration(
          {
            userId: user.id,
            profile: "discovery_question",
            promptId: "discovery_question.generate",
            schema: discoveryQuestionOutputSchema,
            overrides: {
              situationText: situationText.trim(),
              situationGoal: goal,
              additionalContext: additionalContext?.trim() || undefined,
            },
          },
          (text) => enqueue({ type: "text", content: text }),
        );

        if (!generationResult.ok || generationResult.data.questions.length < 5) {
          enqueue({
            type: "result",
            data: { questions: buildFallback(situationText.trim(), goal), source: "fallback" },
          });
        } else {
          enqueue({
            type: "result",
            data: { questions: mapAiQuestions(generationResult.data.questions), source: "ai" },
          });
        }
      } catch {
        enqueue({
          type: "result",
          data: { questions: buildFallback(situationText.trim(), goal), source: "fallback" },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
