import { createClient } from "@/lib/supabase/server";
import { crossOriginRejection, isSameOriginRequest } from "@/lib/http/same-origin";
import {
  allowRequest,
  RATE_LIMIT_MESSAGE,
  STREAM_RATE_LIMIT,
  STREAM_RATE_WINDOW_MS,
} from "@/lib/rate-limit";
import { runStreamingGeneration } from "@/lib/ai/stream";
import { discoveryQuestionOutputSchema } from "@/lib/ai/schemas/discovery-question";
import { createArrayItemParser } from "@/lib/ai/parse-stream";
import {
  MAX_DISCOVERY_QUESTIONS,
  planDiscoveryQuestionSession,
  type PlannedDiscoveryQuestion,
  type SituationGoal,
} from "@/lib/discovery-question-planner";

function mapAiQuestion(
  item: { question: string; category: string; reason: string },
  index: number,
): PlannedDiscoveryQuestion {
  return {
    id: `ai-${index}-${item.category.toLowerCase()}`,
    question: item.question,
    prompt: item.question,
    reason: item.reason,
    category: item.category as PlannedDiscoveryQuestion["category"],
    priority: 100 - index * 5,
    selectedBecause: item.reason,
    isGeneric: false,
  };
}

function mapAiQuestions(
  questions: { question: string; category: string; reason: string }[],
): PlannedDiscoveryQuestion[] {
  return questions.map((item, index) => mapAiQuestion(item, index));
}

function buildFallback(situationText: string, goal: SituationGoal): PlannedDiscoveryQuestion[] {
  return planDiscoveryQuestionSession({ title: situationText, goal }, MAX_DISCOVERY_QUESTIONS);
}

function sseData(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Long-running streamed AI generation: run on the Node.js runtime and allow up
// to 60s so the request is not terminated before generation completes. The
// generation itself is bounded by IDENTITY_ENGINE_TIMEOUT_MS (default 30s).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // Reject cross-site POSTs before any work: this route consumes AI quota on
  // the cookie-authenticated caller's account.
  if (!isSameOriginRequest(request)) {
    return crossOriginRejection();
  }

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

  if (
    !allowRequest(`discovery-questions:${user.id}`, STREAM_RATE_LIMIT, STREAM_RATE_WINDOW_MS)
  ) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: unknown) => {
        controller.enqueue(encoder.encode(sseData(event)));
        controller.enqueue(encoder.encode(": ping\n\n"));
      };

      try {
        let questionIndex = 0;
        const questionParser = createArrayItemParser(["questions"], (item) => {
          const raw = item as { question: string; category: string; reason: string };
          enqueue({ type: "question", data: mapAiQuestion(raw, questionIndex++) });
        });

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
          (text) => questionParser(text),
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
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
