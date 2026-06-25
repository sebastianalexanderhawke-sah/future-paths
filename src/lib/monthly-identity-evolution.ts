import { decodeNativePathFields } from "@/components/home/path-native-title";
import { toFirstSentence } from "@/components/home/output-refinement";
import { loadFutureSelfImpactByPath, type FutureSelfImpactEntry } from "@/lib/future-selves";
import { createClient } from "@/lib/supabase/server";
import type { CheckIn, FutureSelfEvent, IdentityUpdate, Path, ThemeChange } from "@/types/database";
import type { IdentityUpdateType, ThemeName } from "@/types/enums";

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

export type MonthlyFutureShift = {
  futureName: string;
  delta: number;
};

export type MonthlyChosenPathEvidence = {
  id: string;
  title: string;
  themes: ThemeName[];
  chosenAt: string;
};

export type MonthlyIdentityUpdateEvidence = {
  id: string;
  title: string;
  summary: string;
  themes: ThemeName[];
  updateType: IdentityUpdateType;
  createdAt: string;
};

export type MonthlyCheckInEvidence = {
  id: string;
  reflection: string;
  realitySummary: string;
  identityImpact: string;
  themeChanges: ThemeChange[];
  createdAt: string;
  reflectionQuestion: string | null;
  reflectionAnswer: string | null;
};

export type MonthlyIdentityChangeEvidence = {
  identityUpdates: MonthlyIdentityUpdateEvidence[];
  chosenPaths: MonthlyChosenPathEvidence[];
  checkIns: MonthlyCheckInEvidence[];
  dominantThemes: string[];
  futureShifts: MonthlyFutureShift[];
};

export type MonthlyIdentityEvolution = {
  month: string;
  dominantThemes: string[];
  majorDecisions: string[];
  futureShifts: MonthlyFutureShift[];
  identityChangeEvidence: MonthlyIdentityChangeEvidence;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOMINANT_THEME_LIMIT = 4;
const MAJOR_DECISION_LIMIT = 5;
const FUTURE_SHIFT_LIMIT = 5;

// Calendar month in UTC, independent of server timezone, so grouping is
// deterministic regardless of where this runs.
function monthKeyOf(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function pathTitle(path: Pick<Path, "description">): string {
  const { nativeTitle, description } = decodeNativePathFields(path.description);
  return nativeTitle ?? toFirstSentence(description);
}

/** Ranks themes by frequency, keeping first-seen order as the tiebreak (stable sort). */
function rankThemesByFrequency(themes: ThemeName[], limit: number): ThemeName[] {
  const counts = new Map<ThemeName, number>();
  for (const theme of themes) {
    counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([theme]) => theme);
}

function computeDominantThemes(
  monthChosenPaths: Path[],
  monthIdentityUpdates: IdentityUpdate[],
  monthFutureThemes: ThemeName[],
): ThemeName[] {
  const pooled = [
    ...monthChosenPaths.flatMap((path) => path.themes),
    ...monthIdentityUpdates.flatMap((update) => update.themes),
    ...monthFutureThemes,
  ];

  return rankThemesByFrequency(pooled, DOMINANT_THEME_LIMIT);
}

/**
 * Ranks a month's chosen paths into "major decisions": paths that visibly
 * moved a Future Self outrank paths only referenced by an identity update,
 * which outrank everything else (newest first). Each path lands in exactly
 * one tier — the highest one it qualifies for — so nothing is double-counted.
 */
function rankMajorDecisions(
  monthChosenPaths: Path[],
  monthIdentityUpdates: IdentityUpdate[],
  impactByPath: Map<string, FutureSelfImpactEntry[]>,
): Path[] {
  const referencedMomentIds = new Set(monthIdentityUpdates.map((update) => update.moment_id));

  const byChosenAtDesc = (a: Path, b: Path) => (b.chosen_at ?? "").localeCompare(a.chosen_at ?? "");

  const tier1 = monthChosenPaths.filter((path) => impactByPath.has(path.id)).sort(byChosenAtDesc);
  const tier1Ids = new Set(tier1.map((path) => path.id));

  const tier2 = monthChosenPaths
    .filter((path) => !tier1Ids.has(path.id) && referencedMomentIds.has(path.moment_id))
    .sort(byChosenAtDesc);
  const tier2Ids = new Set(tier2.map((path) => path.id));

  const tier3 = monthChosenPaths
    .filter((path) => !tier1Ids.has(path.id) && !tier2Ids.has(path.id))
    .sort(byChosenAtDesc);

  return [...tier1, ...tier2, ...tier3].slice(0, MAJOR_DECISION_LIMIT);
}

function computeFutureShifts(
  monthEvents: FutureSelfEvent[],
  nameById: Map<string, string>,
): MonthlyFutureShift[] {
  const netDeltaByFuture = new Map<string, number>();

  for (const event of monthEvents) {
    const delta = event.percentage_after - (event.percentage_before ?? 0);
    netDeltaByFuture.set(
      event.future_self_id,
      (netDeltaByFuture.get(event.future_self_id) ?? 0) + delta,
    );
  }

  return [...netDeltaByFuture.entries()]
    .map(([futureSelfId, delta]) => ({
      futureName: nameById.get(futureSelfId) ?? "A future self",
      delta,
    }))
    .filter((shift) => shift.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, FUTURE_SHIFT_LIMIT);
}

/**
 * Builds one MonthlyIdentityEvolution per calendar month that had any
 * activity (a chosen path, an identity update, a check-in, or a future-self
 * event). This is aggregation only: no AI calls, no prose, no schema
 * changes — the `identityChangeEvidence` bundle is raw, for a future
 * synthesis step to turn into the "You became more socially engaged" /
 * identity-shift narrative text.
 */
export async function loadMonthlyIdentityEvolution(): Promise<
  { months: MonthlyIdentityEvolution[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();

  const [
    { data: pathRows, error: pathsError },
    { data: identityUpdateRows, error: identityUpdatesError },
    { data: eventRows, error: eventsError },
    { data: futureSelfRows, error: futureSelvesError },
    { data: checkInRows, error: checkInsError },
    impactByPath,
  ] = await Promise.all([
    supabase
      .from("paths")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("is_chosen", true),
    supabase.from("identity_updates").select("*").eq("user_id", auth.userId),
    supabase.from("future_self_events").select("*").eq("user_id", auth.userId),
    supabase.from("future_selves").select("id, name, themes").eq("user_id", auth.userId),
    supabase.from("check_ins").select("*").eq("user_id", auth.userId),
    loadFutureSelfImpactByPath(),
  ]);

  const error = pathsError ?? identityUpdatesError ?? eventsError ?? futureSelvesError ?? checkInsError;
  if (error) {
    return { error: typeof error === "string" ? error : "Failed to load identity evolution data." };
  }

  const chosenPaths: Path[] = pathRows ?? [];
  const identityUpdates: IdentityUpdate[] = identityUpdateRows ?? [];
  const events: FutureSelfEvent[] = eventRows ?? [];
  const futureSelves: { id: string; name: string; themes: ThemeName[] }[] = futureSelfRows ?? [];
  const checkIns: CheckIn[] = checkInRows ?? [];

  const nameById = new Map(futureSelves.map((f) => [f.id, f.name]));
  const themesById = new Map(futureSelves.map((f) => [f.id, f.themes]));

  const monthKeys = new Set<string>([
    ...chosenPaths.filter((p) => p.chosen_at).map((p) => monthKeyOf(p.chosen_at!)),
    ...identityUpdates.map((u) => monthKeyOf(u.created_at)),
    ...events.map((e) => monthKeyOf(e.created_at)),
    ...checkIns.map((c) => monthKeyOf(c.created_at)),
  ]);

  const months = [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => {
      const monthChosenPaths = chosenPaths.filter(
        (p) => p.chosen_at && monthKeyOf(p.chosen_at) === monthKey,
      );
      const monthIdentityUpdates = identityUpdates.filter(
        (u) => monthKeyOf(u.created_at) === monthKey,
      );
      const monthEvents = events.filter((e) => monthKeyOf(e.created_at) === monthKey);
      const monthCheckIns = checkIns.filter((c) => monthKeyOf(c.created_at) === monthKey);

      const monthFutureThemes = monthEvents.flatMap((e) => themesById.get(e.future_self_id) ?? []);

      const dominantThemes = computeDominantThemes(
        monthChosenPaths,
        monthIdentityUpdates,
        monthFutureThemes,
      );
      const futureShifts = computeFutureShifts(monthEvents, nameById);
      const majorDecisions = rankMajorDecisions(
        monthChosenPaths,
        monthIdentityUpdates,
        impactByPath,
      ).map((path) => pathTitle(path));

      const identityChangeEvidence: MonthlyIdentityChangeEvidence = {
        identityUpdates: monthIdentityUpdates.map((update) => ({
          id: update.id,
          title: update.title,
          summary: update.summary,
          themes: update.themes,
          updateType: update.update_type,
          createdAt: update.created_at,
        })),
        chosenPaths: monthChosenPaths.map((path) => ({
          id: path.id,
          title: pathTitle(path),
          themes: path.themes,
          chosenAt: path.chosen_at!,
        })),
        checkIns: monthCheckIns.map((checkIn) => ({
          id: checkIn.id,
          reflection: checkIn.reflection,
          realitySummary: checkIn.reality_summary,
          identityImpact: checkIn.identity_impact,
          themeChanges: checkIn.theme_changes,
          createdAt: checkIn.created_at,
          reflectionQuestion: checkIn.reflection_question ?? null,
          reflectionAnswer: checkIn.reflection_answer ?? null,
        })),
        dominantThemes,
        futureShifts,
      };

      return {
        month: monthLabelOf(monthKey),
        dominantThemes,
        majorDecisions,
        futureShifts,
        identityChangeEvidence,
      };
    });

  return { months };
}
