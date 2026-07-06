import { isProductionRuntime } from "@/lib/ai/config";
import { reportError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-user daily AI generation quota — beta protection against runaway cost.
 *
 * Enforcement lives in the two generation entry points (runStructuredGeneration
 * and runStreamingGeneration): before a real provider call, one unit is
 * consumed from the caller's daily counter via an atomic RPC. Mock generations
 * cost nothing and never consume quota; the check is skipped entirely outside
 * production and for allowlisted admin users.
 *
 * Failure policy is deliberately fail-open: if the quota RPC itself errors
 * (DB blip), the generation proceeds and the error is reported. Quota is abuse
 * protection, not billing correctness — a database hiccup must not take AI
 * features down for every user.
 */

export const DEFAULT_DAILY_GENERATION_LIMIT = 200;

// Surfaced verbatim in the UI wherever generation errors are shown, so keep it
// friendly and self-explanatory rather than operational.
export const QUOTA_EXCEEDED_MESSAGE =
  "You've reached today's limit for AI generations. Everything you've created is safe, " +
  "and the limit resets at midnight UTC — come back tomorrow to keep exploring.";

export function getDailyGenerationLimit(): number {
  const raw = process.env.AI_DAILY_GENERATION_LIMIT?.trim();

  if (!raw) {
    return DEFAULT_DAILY_GENERATION_LIMIT;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DAILY_GENERATION_LIMIT;
}

/**
 * Admin bypass: comma-separated auth user ids in AI_QUOTA_BYPASS_USER_IDS.
 * Development is always bypassed — local work (even against the real API)
 * should never be interrupted by a production abuse cap.
 */
export function isQuotaBypassedForUser(userId: string): boolean {
  if (!isProductionRuntime()) {
    return true;
  }

  const allowlist = process.env.AI_QUOTA_BYPASS_USER_IDS;
  if (!allowlist) {
    return false;
  }

  return allowlist
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

export type QuotaDecision =
  | { allowed: true }
  | { allowed: false; reason: "quota_exceeded" };

export async function consumeGenerationQuota(
  userId: string,
): Promise<QuotaDecision> {
  if (isQuotaBypassedForUser(userId)) {
    return { allowed: true };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("consume_ai_generation_quota", {
      p_limit: getDailyGenerationLimit(),
    });

    if (error) {
      await reportError("ai.quota: quota check failed (failing open)", error.message, {
        userId,
      });
      return { allowed: true };
    }

    return data === false
      ? { allowed: false, reason: "quota_exceeded" }
      : { allowed: true };
  } catch (error) {
    await reportError("ai.quota: quota check failed (failing open)", error, {
      userId,
    });
    return { allowed: true };
  }
}
