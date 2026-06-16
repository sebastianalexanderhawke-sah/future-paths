import type { ForecastSections } from "@/components/home/forecast-utils";
import { createClient } from "@/lib/supabase/server";
import type { Forecast } from "@/types/database";

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

async function requireUser(): Promise<AuthSuccess | AuthFailure> {
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

export async function saveForecast(input: {
  userId: string;
  momentId: string;
  pathId: string | null;
  sections: ForecastSections;
  situationSummary: string;
}): Promise<{ forecast: Forecast } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("forecasts")
    .insert({
      user_id: input.userId,
      moment_id: input.momentId,
      path_id: input.pathId,
      sections_json: input.sections as unknown as Record<string, unknown>,
      situation_summary: input.situationSummary,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to save forecast." };
  }

  return { forecast: data };
}

export async function getLatestForecastForMoment(momentId: string): Promise<{
  forecast: Forecast;
  isRegenerated: boolean;
} | null> {
  const auth = await requireUser();
  if ("error" in auth) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forecasts")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .order("generated_at", { ascending: false })
    .limit(2);

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    forecast: data[0],
    isRegenerated: data.length > 1,
  };
}

/**
 * Returns the set of momentIds (from the given list) that have at least one
 * saved forecast. Safe to call with an empty array.
 */
export async function getForecastExistenceForMoments(
  momentIds: string[],
): Promise<Set<string>> {
  if (momentIds.length === 0) return new Set();

  const auth = await requireUser();
  if ("error" in auth) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("forecasts")
    .select("moment_id")
    .in("moment_id", momentIds)
    .eq("user_id", auth.userId);

  if (!data) return new Set();
  return new Set(data.map((row) => row.moment_id));
}

export async function hasForecastForMomentAndPath(
  momentId: string,
  pathId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forecasts")
    .select("id")
    .eq("moment_id", momentId)
    .eq("path_id", pathId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return !error && data !== null;
}

/**
 * Casts JSONB sections from the database back to the typed ForecastSections shape.
 * Fields are plain JavaScript objects after JSONB round-trip, but match the shape.
 */
export function parseForecastSections(
  sectionsJson: Record<string, unknown>,
): ForecastSections {
  return sectionsJson as unknown as ForecastSections;
}

/**
 * Builds an ordered list of reality-summary strings from all check-ins for a
 * moment (chronological, oldest first). This is passed as checkInHistory to
 * the forecast regeneration context.
 */
export function buildCheckInHistory(
  checkIns: Array<{ reality_summary: string }>,
): string[] {
  return checkIns.map((ci) => ci.reality_summary);
}
