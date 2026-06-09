import { enforceContextLimits } from "@/lib/ai/context/truncate";
import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import type { BuildContextOptions } from "@/lib/ai/context/profiles";
import { CONTEXT_LIMITS } from "@/lib/ai/context/limits";
import { createClient } from "@/lib/supabase/server";
import type { ThemeName } from "@/types/enums";
import type { AnsweredPromptResponse } from "@/lib/mock-contradiction-generator";

export type { BuildContextOptions, BuildContextOverrides, ContextProfile } from "@/lib/ai/context/profiles";
export type { IdentityContextBundle } from "@/lib/ai/context/slices";
export { CONTEXT_LIMITS } from "@/lib/ai/context/limits";
export { serializeContext } from "@/lib/ai/context/truncate";

export async function buildIdentityContext(
  options: BuildContextOptions,
): Promise<IdentityContextBundle | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== options.userId) {
    return { error: "Not authenticated." };
  }

  const base: IdentityContextBundle = {
    userId: options.userId,
    profile: options.profile,
  };

  switch (options.profile) {
    case "crossroad":
      return enforceContextLimits(await loadCrossroadContext(supabase, base, options));
    case "check_in":
      return enforceContextLimits(await loadCheckInContext(supabase, base, options));
    case "identity_update":
      return enforceContextLimits(await loadIdentityUpdateContext(supabase, base, options));
    case "future_self":
      return enforceContextLimits(await loadFutureSelfContext(supabase, base));
    case "current_self":
      return enforceContextLimits(await loadCurrentSelfContext(supabase, base));
    case "identity_prompt":
      return enforceContextLimits(await loadIdentityPromptContext(supabase, base));
    case "contradiction":
      return enforceContextLimits(await loadContradictionContext(supabase, base));
    case "past_alternative_path":
      return enforceContextLimits(await loadPastPathContext(supabase, base, options));
    case "alternate_self":
      return enforceContextLimits(await loadAlternateSelfContext(supabase, base, options));
    case "timeline":
      return enforceContextLimits(await loadTimelineContext(supabase, base));
    default:
      return { error: "Unknown context profile." };
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadCrossroadContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
  options: BuildContextOptions,
): Promise<IdentityContextBundle> {
  if (!options.overrides?.momentId) {
    return base;
  }

  const { data: moment } = await supabase
    .from("moments")
    .select("id, title, description")
    .eq("id", options.overrides.momentId)
    .eq("user_id", options.userId)
    .maybeSingle();

  return { ...base, moment: moment ?? undefined };
}

async function loadCheckInContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
  options: BuildContextOptions,
): Promise<IdentityContextBundle> {
  const momentId = options.overrides?.momentId;
  const pathId = options.overrides?.pathId;

  let bundle = { ...base, reflection: options.overrides?.reflection };

  if (momentId) {
    const { data: moment } = await supabase
      .from("moments")
      .select("id, title, description")
      .eq("id", momentId)
      .eq("user_id", options.userId)
      .maybeSingle();

    bundle = { ...bundle, moment: moment ?? undefined };
  }

  if (pathId) {
    const { data: path } = await supabase
      .from("paths")
      .select("id, description, themes, future_shift")
      .eq("id", pathId)
      .eq("user_id", options.userId)
      .maybeSingle();

    bundle = { ...bundle, chosenPath: path ?? undefined };
  }

  return bundle;
}

async function loadIdentityUpdateContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
  options: BuildContextOptions,
): Promise<IdentityContextBundle> {
  const bundle = await loadCheckInContext(supabase, base, options);
  const momentId = options.overrides?.momentId;

  if (!momentId) {
    return bundle;
  }

  const { data: priorCheckIns } = await supabase
    .from("check_ins")
    .select("theme_changes")
    .eq("user_id", options.userId)
    .eq("moment_id", momentId)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.checkIns);

  return {
    ...bundle,
    checkInHistory: priorCheckIns ?? [],
  };
}

async function loadFutureSelfContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
): Promise<IdentityContextBundle> {
  const [{ count: momentCount }, { count: checkInCount }] = await Promise.all([
    supabase
      .from("moments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", base.userId),
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", base.userId),
  ]);

  const { data: chosenPaths } = await supabase
    .from("paths")
    .select("themes")
    .eq("user_id", base.userId)
    .eq("is_chosen", true)
    .limit(CONTEXT_LIMITS.COUNTS.chosenPaths);

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("theme_changes, identity_impact")
    .eq("user_id", base.userId)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.checkIns);

  const { data: identityUpdates } = await supabase
    .from("identity_updates")
    .select("themes")
    .eq("user_id", base.userId)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.identityUpdates);

  return {
    ...base,
    counts: {
      moments: momentCount ?? 0,
      checkIns: checkInCount ?? 0,
    },
    pathThemes: (chosenPaths ?? []).flatMap((path) => path.themes),
    checkIns: checkIns ?? [],
    identityUpdates: (identityUpdates ?? []).map((update) => ({
      title: "",
      summary: "",
      themes: update.themes,
    })),
  };
}

async function loadCurrentSelfContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
): Promise<IdentityContextBundle> {
  const [{ count: momentCount }, { count: checkInCount }] = await Promise.all([
    supabase
      .from("moments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", base.userId),
    supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", base.userId),
  ]);

  const { data: activeFutureSelves } = await supabase
    .from("future_selves")
    .select("name, description, momentum, themes")
    .eq("user_id", base.userId)
    .eq("status", "active")
    .order("momentum", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.futureSelves);

  const { data: chosenPaths } = await supabase
    .from("paths")
    .select("themes")
    .eq("user_id", base.userId)
    .eq("is_chosen", true)
    .limit(CONTEXT_LIMITS.COUNTS.chosenPaths);

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("theme_changes, identity_impact")
    .eq("user_id", base.userId)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.checkIns);

  const { data: identityUpdates } = await supabase
    .from("identity_updates")
    .select("title, summary, themes")
    .eq("user_id", base.userId)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.identityUpdates);

  return {
    ...base,
    counts: {
      moments: momentCount ?? 0,
      checkIns: checkInCount ?? 0,
    },
    futureSelves: activeFutureSelves ?? [],
    pathThemes: (chosenPaths ?? []).flatMap((path) => path.themes as ThemeName[]),
    checkIns: checkIns ?? [],
    identityUpdates: identityUpdates ?? [],
  };
}

async function loadIdentityPromptContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
): Promise<IdentityContextBundle> {
  const bundle = await loadCurrentSelfContext(supabase, base);

  const { data: currentSelf } = await supabase
    .from("current_self")
    .select("headline, summary, themes")
    .eq("user_id", base.userId)
    .maybeSingle();

  return {
    ...bundle,
    currentSelf: currentSelf ?? undefined,
  };
}

async function loadContradictionContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
): Promise<IdentityContextBundle> {
  const { count: checkInCount } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("user_id", base.userId);

  const { data: currentSelf } = await supabase
    .from("current_self")
    .select("headline, summary, themes")
    .eq("user_id", base.userId)
    .maybeSingle();

  const { data: activeFutureSelves } = await supabase
    .from("future_selves")
    .select("name, description, momentum, themes")
    .eq("user_id", base.userId)
    .eq("status", "active")
    .order("momentum", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.futureSelves);

  const { data: answeredPrompts } = await supabase
    .from("identity_prompts")
    .select("id, prompt_type, question, themes")
    .eq("user_id", base.userId)
    .eq("status", "answered")
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMITS.COUNTS.answeredPrompts);

  const promptIds = (answeredPrompts ?? []).map((prompt) => prompt.id);
  let answeredResponses: AnsweredPromptResponse[] = [];

  if (promptIds.length > 0) {
    const { data: responses } = await supabase
      .from("identity_prompt_responses")
      .select("id, prompt_id, response, themes")
      .eq("user_id", base.userId)
      .in("prompt_id", promptIds);

    const promptById = new Map((answeredPrompts ?? []).map((prompt) => [prompt.id, prompt]));

    answeredResponses = (responses ?? []).flatMap((response) => {
      const prompt = promptById.get(response.prompt_id);
      return prompt ? [{ prompt, response }] : [];
    });
  }

  return {
    ...base,
    checkInCount: checkInCount ?? 0,
    currentSelf: currentSelf ?? undefined,
    futureSelves: activeFutureSelves ?? [],
    answeredPrompts: answeredResponses,
  };
}

async function loadPastPathContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
  options: BuildContextOptions,
): Promise<IdentityContextBundle> {
  if (!options.overrides?.crossroadId) {
    return base;
  }

  const { data: crossroad } = await supabase
    .from("past_crossroads")
    .select("id, what_happened, why_chosen, life_stage")
    .eq("id", options.overrides.crossroadId)
    .eq("user_id", options.userId)
    .maybeSingle();

  return { ...base, pastCrossroad: crossroad ?? undefined };
}

async function loadAlternateSelfContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
  options: BuildContextOptions,
): Promise<IdentityContextBundle> {
  const bundle = await loadPastPathContext(supabase, base, options);

  if (!options.overrides?.selectedPathId) {
    return bundle;
  }

  const { data: selectedPath } = await supabase
    .from("past_alternative_paths")
    .select("title, description, themes, possible_future_shift")
    .eq("id", options.overrides.selectedPathId)
    .eq("user_id", options.userId)
    .maybeSingle();

  return { ...bundle, selectedPastPath: selectedPath ?? undefined };
}

async function loadTimelineContext(
  supabase: SupabaseClient,
  base: IdentityContextBundle,
): Promise<IdentityContextBundle> {
  const [
    { data: moments },
    { data: chosenPaths },
    { data: checkIns },
    { data: identityUpdates },
    { data: futureSelves },
    { data: contradictions },
    { data: alternateSelves },
    { data: currentSelf },
  ] = await Promise.all([
    supabase
      .from("moments")
      .select("id, title, created_at, status")
      .eq("user_id", base.userId)
      .eq("status", "active")
      .limit(CONTEXT_LIMITS.COUNTS.moments),
    supabase
      .from("paths")
      .select("id, moment_id, description, themes, chosen_at, created_at")
      .eq("user_id", base.userId)
      .eq("is_chosen", true)
      .limit(CONTEXT_LIMITS.COUNTS.chosenPaths),
    supabase
      .from("check_ins")
      .select("id, reflection, theme_changes, identity_impact, created_at")
      .eq("user_id", base.userId)
      .order("created_at", { ascending: false })
      .limit(CONTEXT_LIMITS.COUNTS.checkIns),
    supabase
      .from("identity_updates")
      .select("id, title, summary, themes, created_at")
      .eq("user_id", base.userId)
      .order("created_at", { ascending: false })
      .limit(CONTEXT_LIMITS.COUNTS.identityUpdates),
    supabase
      .from("future_selves")
      .select("id, name, momentum, themes, status, updated_at")
      .eq("user_id", base.userId)
      .eq("status", "active")
      .limit(CONTEXT_LIMITS.COUNTS.futureSelves),
    supabase
      .from("contradictions")
      .select("id, title, themes, intensity, status, updated_at")
      .eq("user_id", base.userId)
      .in("status", ["active", "softened"])
      .limit(CONTEXT_LIMITS.COUNTS.contradictions),
    supabase
      .from("alternate_selves")
      .select("id, name, themes, status, updated_at, past_crossroad_id")
      .eq("user_id", base.userId)
      .eq("status", "active")
      .limit(CONTEXT_LIMITS.COUNTS.alternateSelves),
    supabase
      .from("current_self")
      .select("headline, summary, themes")
      .eq("user_id", base.userId)
      .maybeSingle(),
  ]);

  const crossroadIds = [...new Set((alternateSelves ?? []).map((row) => row.past_crossroad_id))];
  const crossroadSnippets: Record<string, string> = {};

  if (crossroadIds.length > 0) {
    const { data: crossroads } = await supabase
      .from("past_crossroads")
      .select("id, what_happened")
      .eq("user_id", base.userId)
      .in("id", crossroadIds);

    for (const crossroad of crossroads ?? []) {
      crossroadSnippets[crossroad.id] = crossroad.what_happened.trim();
    }
  }

  return {
    ...base,
    timelineMoments: moments ?? [],
    timelineChosenPaths: chosenPaths ?? [],
    timelineCheckIns: checkIns ?? [],
    timelineIdentityUpdates: identityUpdates ?? [],
    timelineFutureSelves: futureSelves ?? [],
    contradictions: contradictions ?? [],
    alternateSelves: alternateSelves ?? [],
    crossroadSnippets,
    currentSelf: currentSelf ?? undefined,
  };
}
