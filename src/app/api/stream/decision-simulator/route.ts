import { createClient } from "@/lib/supabase/server";
import { deleteMoment } from "@/lib/moments";
import { runStreamingGeneration } from "@/lib/ai/stream";
import { crossroadOutputSchema } from "@/lib/ai/schemas/crossroad";
import { createArrayItemParser } from "@/lib/ai/parse-stream";
import { encodePathDescriptionWithNativeTitle } from "@/components/home/path-native-title";
import { isAiAuditEnabled, toRawPathsAudit } from "@/lib/ai-audit";
import type { ThemeName } from "@/types/enums";

function collectThemes(paths: { themes: ThemeName[] }[]): ThemeName[] {
  const seen = new Set<ThemeName>();
  for (const path of paths) {
    for (const theme of path.themes) {
      seen.add(theme);
    }
  }
  return [...seen];
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

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .insert({
      user_id: user.id,
      title,
      description: contextSummary ?? null,
    })
    .select("*")
    .single();

  if (momentError || !moment) {
    return Response.json(
      { error: momentError?.message ?? "Failed to create moment" },
      { status: 500 },
    );
  }

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

        await supabase
          .from("moments")
          .update({
            current_understanding: generated.current_understanding,
            opportunity_themes: generated.opportunity_themes,
            risk_themes: generated.risk_themes,
          })
          .eq("id", moment.id)
          .eq("user_id", user.id);

        const pathRows = generated.paths.map((path, index) => ({
          moment_id: moment.id,
          user_id: user.id,
          description: encodePathDescriptionWithNativeTitle(
            path.title ?? "",
            path.description,
          ),
          benefits: path.benefits,
          consequences: path.consequences,
          future_shift: path.future_shift,
          themes: path.themes,
          sort_order: index,
        }));

        const { data: insertedPaths, error: pathsError } = await supabase
          .from("paths")
          .insert(pathRows)
          .select("*");

        if (pathsError || !insertedPaths) {
          await cleanupOrphanedMoment();
          enqueue({
            type: "error",
            error: pathsError?.message ?? "Failed to insert paths",
          });
          return;
        }

        const themes = collectThemes(generated.paths);

        await supabase.from("timeline_events").insert({
          user_id: user.id,
          event_type: "paths_generated",
          reference_type: "moment",
          reference_id: moment.id,
          title: "Paths explored",
          summary: generated.current_understanding,
          metadata: {
            moment_id: moment.id,
            moment_title: title,
            path_count: insertedPaths.length,
            themes,
          },
        });

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
