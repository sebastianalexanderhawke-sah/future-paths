import { createClient } from "@/lib/supabase/server";
import { createMoment, deleteMoment } from "@/lib/moments";
import { persistGeneratedPaths } from "@/lib/paths";
import { runStreamingGeneration } from "@/lib/ai/stream";
import { crossroadOutputSchema } from "@/lib/ai/schemas/crossroad";
import { createArrayItemParser } from "@/lib/ai/parse-stream";
import { isAiAuditEnabled, toRawPathsAudit } from "@/lib/ai-audit";

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

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const title = situationText.trim();

  const momentResult = await createMoment({
    title,
    description: contextSummary ?? null,
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

      // This route always creates the moment above, so a generation failure
      // before a successful result must remove it rather than leave an empty
      // situation behind.
      const cleanupOrphanedMoment = async () => {
        await deleteMoment(moment.id).catch(() => {});
      };

      try {
        const pathParser = createArrayItemParser(["paths"], (item) => {
          enqueue({ type: "path", data: item });
        });

        const generationResult = await runStreamingGeneration(
          {
            userId: user.id,
            profile: "crossroad",
            promptId: "crossroad.generate",
            schema: crossroadOutputSchema,
            overrides: { momentId: moment.id },
          },
          (text) => pathParser(text),
        );

        if (!generationResult.ok) {
          await cleanupOrphanedMoment();
          enqueue({ type: "error", error: generationResult.error });
          return;
        }

        const generated = generationResult.data;

        const persistResult = await persistGeneratedPaths({
          momentId: moment.id,
          momentTitle: title,
          generated,
        });

        if ("error" in persistResult) {
          await cleanupOrphanedMoment();
          enqueue({ type: "error", error: persistResult.error });
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
        await cleanupOrphanedMoment();
        enqueue({
          type: "error",
          error: error instanceof Error ? error.message : "An error occurred",
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
