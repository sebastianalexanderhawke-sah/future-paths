import Anthropic from "@anthropic-ai/sdk";

import {
  getAnthropicApiKey,
  getClaudeModel,
  getGenerationTimeoutMs,
  resolveProviderForMode,
} from "@/lib/ai/config";
import {
  behaviorExtractionOutputSchema,
  type BehaviorExtractionOutput,
} from "@/lib/ai/schemas/behavior";
import {
  behaviorExtractV1,
  type SituationInput,
} from "@/lib/ai/prompts/behavior_extract.v1";
import { createClient } from "@/lib/supabase/server";
import type { BehaviorObservationInsert } from "@/types/database";

function extractJson(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    const start = trimmed.indexOf("{");
    if (start >= 0) return JSON.parse(trimmed.slice(start));

    throw new Error("Response did not contain JSON.");
  }
}

type ExtractionResult =
  | { ok: true; data: BehaviorExtractionOutput }
  | { ok: false; error: string };

export async function extractBehaviorObservations(
  input: SituationInput,
): Promise<ExtractionResult> {
  const provider = resolveProviderForMode();

  if (provider === "mock") {
    return { ok: true, data: { observations: [] } };
  }

  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not configured." };
  }

  const __aiT0 = Date.now();
  console.log(
    `[PROFILE] extractBehaviorObservations STAGE=Anthropic API call | start=${new Date(__aiT0).toISOString()}`,
  );
  try {
    const client = new Anthropic({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getGenerationTimeoutMs());

    const response = await client.messages.create(
      {
        model: getClaudeModel(),
        max_tokens: 1024,
        temperature: 0.2,
        system: behaviorExtractV1.buildSystemPrompt(),
        messages: [{ role: "user", content: behaviorExtractV1.buildUserPrompt(input) }],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);
    console.log(
      `[PROFILE] extractBehaviorObservations STAGE=Anthropic API call | end=${new Date().toISOString()} durationMs=${Date.now() - __aiT0}`,
    );

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      return { ok: false, error: "AI returned an empty response." };
    }

    const raw = extractJson(text);
    const data = behaviorExtractionOutputSchema.parse(raw);

    return { ok: true, data };
  } catch (error) {
    console.log(
      `[PROFILE] extractBehaviorObservations STAGE=Anthropic API call | THREW at ${new Date().toISOString()} durationMs=${Date.now() - __aiT0}`,
    );
    const message =
      error instanceof Error ? error.message : "Behavior extraction failed.";
    return { ok: false, error: message };
  }
}

type PersistResult = {
  ok: boolean;
  inserted: number;
  error?: string;
};

export async function extractAndPersistBehaviorObservations(
  userId: string,
  momentId: string,
): Promise<PersistResult> {
  const __t0 = Date.now();
  console.log(
    `[PROFILE] extractAndPersistBehaviorObservations TOTAL | start=${new Date(__t0).toISOString()} momentId=${momentId}`,
  );
  const supabase = await createClient();

  const [momentResult, pathResult, checkInResult] = await Promise.all([
    supabase
      .from("moments")
      .select("id, title, description")
      .eq("id", momentId)
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("paths")
      .select("description")
      .eq("moment_id", momentId)
      .eq("user_id", userId)
      .eq("is_chosen", true)
      .maybeSingle(),

    supabase
      .from("check_ins")
      .select("reflection, identity_impact")
      .eq("moment_id", momentId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (momentResult.error || !momentResult.data) {
    return {
      ok: false,
      inserted: 0,
      error: momentResult.error?.message ?? "Situation not found.",
    };
  }

  const moment = momentResult.data;
  const path = pathResult.data;
  const checkIn = checkInResult.data;

  const input: SituationInput = {
    situationTitle: moment.title,
    situationDescription: moment.description ?? undefined,
    chosenPathDescription: path?.description ?? undefined,
    checkInReflection: checkIn?.reflection ?? undefined,
    identityImpact: checkIn?.identity_impact ?? undefined,
  };

  const result = await extractBehaviorObservations(input);

  if (!result.ok) {
    console.log(
      `[PROFILE] extractAndPersistBehaviorObservations TOTAL | end=${new Date().toISOString()} durationMs=${Date.now() - __t0} (extraction failed)`,
    );
    return { ok: false, inserted: 0, error: result.error };
  }

  const { observations } = result.data;

  if (observations.length === 0) {
    console.log(
      `[PROFILE] extractAndPersistBehaviorObservations TOTAL | end=${new Date().toISOString()} durationMs=${Date.now() - __t0} (0 observations)`,
    );
    return { ok: true, inserted: 0 };
  }

  const rows: BehaviorObservationInsert[] = observations.map((obs) => ({
    user_id: userId,
    moment_id: momentId,
    observation: obs.observation,
    signals: obs.signals,
    source_type: "situation_complete",
  }));

  const { error: insertError } = await supabase
    .from("behavior_observations")
    .insert(rows);

  if (insertError) {
    console.log(
      `[PROFILE] extractAndPersistBehaviorObservations TOTAL | end=${new Date().toISOString()} durationMs=${Date.now() - __t0} (insert failed)`,
    );
    return { ok: false, inserted: 0, error: insertError.message };
  }

  console.log(
    `[PROFILE] extractAndPersistBehaviorObservations TOTAL | end=${new Date().toISOString()} durationMs=${Date.now() - __t0} inserted=${rows.length}`,
  );
  return { ok: true, inserted: rows.length };
}
