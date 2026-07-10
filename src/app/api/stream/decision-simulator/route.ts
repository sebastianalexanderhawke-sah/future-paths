import { createClient } from "@/lib/supabase/server";
import { createMoment } from "@/lib/moments";
import { persistGeneratedPaths } from "@/lib/paths";
import { generateDiverseCrossroadSet } from "@/lib/crossroad-generation";
import { createArrayItemParser } from "@/lib/ai/parse-stream";
import { isAiAuditEnabled, toRawPathsAudit } from "@/lib/ai-audit";
import {
  allowRequest,
  RATE_LIMIT_MESSAGE,
  STREAM_RATE_LIMIT,
  STREAM_RATE_WINDOW_MS,
} from "@/lib/rate-limit";

function sseData(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Long-running streamed AI generation: run on the Node.js runtime and allow up
// to 60s so the request is not terminated before generation completes. The
// generation itself is bounded by IDENTITY_ENGINE_TIMEOUT_MS (default 30s).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.situationText !== "string" || !body.situationText.trim()) {
    return Response.json({ error: "situationText is required" }, { status: 400 });
  }

  const { situationText, contextSummary } = body as {
    situationText: string;
    contextSummary: string | null;
  };

  const clientToken =
    typeof body.clientToken === "string" && body.clientToken ? body.clientToken : null;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (
    !allowRequest(`decision-simulator:${user.id}`, STREAM_RATE_LIMIT, STREAM_RATE_WINDOW_MS)
  ) {
    return Response.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const title = situationText.trim();

  const momentResult = await createMoment({
    title,
    description: contextSummary ?? null,
    clientToken,
  });

  if ("error" in momentResult) {
    return Response.json({ error: momentResult.error }, { status: 500 });
  }

  const moment = momentResult.moment;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: unknown) => {
        controller.enqueue(encoder.encode(sseData(event)));
        controller.enqueue(encoder.encode(": ping\n\n"));
      };

      try {
        const pathParser = createArrayItemParser(["paths"], (item) => {
          enqueue({ type: "path", data: item });
        });

        // Situations v3: shared generation + set-level diversity validation.
        // Only the first attempt streams path events; if the set is rejected
        // and regenerated, the final "result" event below replaces whatever
        // the client rendered progressively.
        const generationResult = await generateDiverseCrossroadSet({
          userId: user.id,
          momentId: moment.id,
          onChunk: (text) => pathParser(text),
        });

        // Failures past this point keep the situation: it holds the user's
        // full written context, and the client offers "Resume generation"
        // against it (the moment page's generate actions are the fallback).
        // Deleting it here would destroy that context on an AI outage.
        if (!generationResult.ok) {
          enqueue({ type: "error", error: generationResult.error, momentId: moment.id });
          return;
        }

        const generated = generationResult.data;

        const persistResult = await persistGeneratedPaths({
          momentId: moment.id,
          momentTitle: title,
          generated,
        });

        if ("error" in persistResult) {
          enqueue({ type: "error", error: persistResult.error, momentId: moment.id });
          return;
        }

        const insertedPaths = persistResult.paths;

        enqueue({
          type: "result",
          data: {
            momentId: moment.id,
            currentUnderstanding: generated.current_understanding,
            paths: insertedPaths,
            ...(isAiAuditEnabled()
              ? { audit: { rawPaths: toRawPathsAudit(insertedPaths) } }
              : {}),
          },
        });
      } catch (error) {
        enqueue({
          type: "error",
          error: error instanceof Error ? error.message : "An error occurred",
          momentId: moment.id,
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
