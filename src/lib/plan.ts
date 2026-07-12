import { createClient } from "@/lib/supabase/server";

/**
 * The user's plan and available usage, shown by Settings → Reflection
 * Premium. Entitlements live in Supabase auth `app_metadata` — writable
 * only with the service role (a future billing webhook), never by the
 * client — so nothing in the app can grant itself Premium. Until billing
 * launches, every account derives to the Free plan with zero tokens.
 *
 * Expected app_metadata fields (absent today, written by billing later):
 *   plan: "premium"            — active subscription
 *   premium_renews_at: string  — ISO date of the next renewal
 *   situation_tokens: number   — remaining purchased situation tokens
 */
export type PlanStatus = {
  plan: "free" | "premium";
  /** ISO date the subscription renews — null unless premium. */
  renewsAt: string | null;
  /** Remaining purchased situation tokens. */
  situationTokens: number;
  /** Situations recorded, capped at the free allowance for display. */
  situationsUsed: number;
  /** Situations included with the Free plan. */
  freeSituationAllowance: number;
};

export const FREE_SITUATION_ALLOWANCE = 1;
/** One token pack permanently unlocks this many additional situations. */
export const TOKENS_PER_PACK = 6;

/** Pure derivation from auth metadata + usage — separately testable. */
export function derivePlanStatus(
  appMetadata: Record<string, unknown> | null | undefined,
  situationCount: number,
): PlanStatus {
  const isPremium = appMetadata?.plan === "premium";

  const rawRenewsAt = appMetadata?.premium_renews_at;
  const renewsAt =
    isPremium && typeof rawRenewsAt === "string" && !Number.isNaN(Date.parse(rawRenewsAt))
      ? rawRenewsAt
      : null;

  const rawTokens = appMetadata?.situation_tokens;
  const situationTokens =
    typeof rawTokens === "number" && Number.isFinite(rawTokens)
      ? Math.max(0, Math.floor(rawTokens))
      : 0;

  return {
    plan: isPremium ? "premium" : "free",
    renewsAt,
    situationTokens,
    situationsUsed: Math.min(Math.max(0, situationCount), FREE_SITUATION_ALLOWANCE),
    freeSituationAllowance: FREE_SITUATION_ALLOWANCE,
  };
}

export async function getPlanStatus(): Promise<PlanStatus> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return derivePlanStatus(null, 0);
  }

  const { count } = await supabase
    .from("moments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return derivePlanStatus(
    (user.app_metadata ?? null) as Record<string, unknown> | null,
    count ?? 0,
  );
}
