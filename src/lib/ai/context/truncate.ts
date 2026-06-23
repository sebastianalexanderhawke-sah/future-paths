import { CONTEXT_LIMITS } from "@/lib/ai/context/limits";
import type { IdentityContextBundle } from "@/lib/ai/context/slices";

export function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

export function truncateNullableText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  return truncateText(value, maxLength);
}

function truncateArray<T>(items: T[] | undefined, maxItems: number): T[] | undefined {
  if (!items) {
    return undefined;
  }

  return items.slice(0, maxItems);
}

export function enforceContextLimits(bundle: IdentityContextBundle): IdentityContextBundle {
  const limits = CONTEXT_LIMITS.TEXT;

  const next: IdentityContextBundle = {
    ...bundle,
    reflection: bundle.reflection
      ? truncateText(bundle.reflection, limits.reflection)
      : undefined,
    pathThemes: bundle.pathThemes,
    checkInCount: bundle.checkInCount,
    crossroadSnippets: bundle.crossroadSnippets,
    chapterCandidates: bundle.chapterCandidates,
  };

  if (bundle.moment) {
    next.moment = {
      ...bundle.moment,
      title: truncateText(bundle.moment.title, limits.momentTitle),
      description: truncateNullableText(bundle.moment.description, limits.momentDescription),
    };
  }

  if (bundle.chosenPath) {
    next.chosenPath = {
      ...bundle.chosenPath,
      description: truncateText(bundle.chosenPath.description, limits.pathDescription),
    };
  }

  if (bundle.mostRecentChosenPath) {
    next.mostRecentChosenPath = {
      ...bundle.mostRecentChosenPath,
      description: truncateText(bundle.mostRecentChosenPath.description, limits.pathDescription),
    };
  }

  if (bundle.checkIn) {
    next.checkIn = {
      ...bundle.checkIn,
      reflection: truncateText(bundle.checkIn.reflection, limits.reflection),
      identity_impact: truncateText(bundle.checkIn.identity_impact, limits.identityImpact),
    };
  }

  next.checkInHistory = truncateArray(bundle.checkInHistory, CONTEXT_LIMITS.COUNTS.checkIns);
  next.checkIns = truncateArray(bundle.checkIns, CONTEXT_LIMITS.COUNTS.checkIns)?.map(
    (checkIn) => ({
      ...checkIn,
      identity_impact: truncateText(checkIn.identity_impact, limits.identityImpact),
      reality_summary: truncateText(checkIn.reality_summary, limits.realitySummary),
    }),
  );

  next.identityUpdates = truncateArray(
    bundle.identityUpdates,
    CONTEXT_LIMITS.COUNTS.identityUpdates,
  )?.map((update) => ({
    ...update,
    title: truncateText(update.title, limits.genericLabel),
    summary: truncateText(update.summary, limits.summary),
  }));

  next.futureSelves = truncateArray(
    bundle.futureSelves,
    CONTEXT_LIMITS.COUNTS.futureSelves,
  )?.map((futureSelf) => ({
    ...futureSelf,
    name: truncateText(futureSelf.name, limits.alternateSelfName),
    summary: truncateText(futureSelf.summary, limits.summary),
  }));

  if (bundle.currentSelf) {
    next.currentSelf = {
      ...bundle.currentSelf,
      title: truncateText(bundle.currentSelf.title, limits.title),
      summary: truncateText(bundle.currentSelf.summary, limits.summary),
      observations: bundle.currentSelf.observations.map((observation) =>
        truncateText(observation, limits.observation),
      ),
    };
  }

  next.recentMoments = truncateArray(
    bundle.recentMoments,
    CONTEXT_LIMITS.COUNTS.moments,
  )?.map((moment) => ({
    ...moment,
    title: truncateText(moment.title, limits.momentTitle),
    description: truncateNullableText(moment.description, limits.momentDescription),
  }));

  next.currentSelfChosenPaths = truncateArray(
    bundle.currentSelfChosenPaths,
    CONTEXT_LIMITS.COUNTS.chosenPaths,
  )?.map((path) => ({
    ...path,
    description: truncateText(path.description, limits.pathDescription),
  }));

  next.currentSelfCheckIns = truncateArray(
    bundle.currentSelfCheckIns,
    CONTEXT_LIMITS.COUNTS.checkIns,
  )?.map((checkIn) => ({
    ...checkIn,
    reflection: truncateText(checkIn.reflection, limits.reflection),
    reality_summary: truncateText(checkIn.reality_summary, limits.realitySummary),
    identity_impact: truncateText(checkIn.identity_impact, limits.identityImpact),
    reflection_question: truncateNullableText(checkIn.reflection_question, limits.question),
    reflection_answer: truncateNullableText(checkIn.reflection_answer, limits.response),
  }));

  next.answeredPrompts = truncateArray(
    bundle.answeredPrompts,
    CONTEXT_LIMITS.COUNTS.answeredPrompts,
  )?.map((entry) => ({
    prompt: {
      ...entry.prompt,
      question: truncateText(entry.prompt.question, limits.question),
    },
    response: {
      ...entry.response,
      response: truncateText(entry.response.response, limits.response),
    },
  }));

  if (bundle.pastCrossroad) {
    next.pastCrossroad = {
      ...bundle.pastCrossroad,
      what_happened: truncateText(
        bundle.pastCrossroad.what_happened,
        limits.crossroadWhatHappened,
      ),
      why_chosen: truncateNullableText(
        bundle.pastCrossroad.why_chosen,
        limits.crossroadWhyChosen,
      ),
      life_stage: truncateNullableText(
        bundle.pastCrossroad.life_stage,
        limits.crossroadLifeStage,
      ),
    };
  }

  if (bundle.selectedPastPath) {
    next.selectedPastPath = {
      ...bundle.selectedPastPath,
      title: truncateText(bundle.selectedPastPath.title, limits.genericLabel),
      description: truncateText(
        bundle.selectedPastPath.description,
        limits.pathDescription,
      ),
      possible_future_shift: truncateText(
        bundle.selectedPastPath.possible_future_shift,
        limits.summary,
      ),
    };
  }

  next.alternateSelves = truncateArray(
    bundle.alternateSelves,
    CONTEXT_LIMITS.COUNTS.alternateSelves,
  );

  next.contradictions = truncateArray(
    bundle.contradictions,
    CONTEXT_LIMITS.COUNTS.contradictions,
  )?.map((contradiction) => ({
    ...contradiction,
    title: truncateText(contradiction.title, limits.contradictionTitle),
  }));

  next.timelineMoments = truncateArray(
    bundle.timelineMoments,
    CONTEXT_LIMITS.COUNTS.moments,
  )?.map((moment) => ({
    ...moment,
    title: truncateText(moment.title, limits.momentTitle),
  }));

  next.timelineChosenPaths = truncateArray(
    bundle.timelineChosenPaths,
    CONTEXT_LIMITS.COUNTS.chosenPaths,
  );

  next.timelineCheckIns = truncateArray(
    bundle.timelineCheckIns,
    CONTEXT_LIMITS.COUNTS.checkIns,
  )?.map((checkIn) => ({
    ...checkIn,
    reflection: truncateText(checkIn.reflection, limits.reflection),
    identity_impact: truncateText(checkIn.identity_impact, limits.identityImpact),
  }));

  next.timelineIdentityUpdates = truncateArray(
    bundle.timelineIdentityUpdates,
    CONTEXT_LIMITS.COUNTS.identityUpdates,
  );

  next.timelineFutureSelves = truncateArray(
    bundle.timelineFutureSelves,
    CONTEXT_LIMITS.COUNTS.futureSelves,
  );

  if (next.crossroadSnippets) {
    const trimmed: Record<string, string> = {};

    for (const [key, value] of Object.entries(next.crossroadSnippets)) {
      trimmed[key] = truncateText(value, limits.evidenceLabel);
    }

    next.crossroadSnippets = trimmed;
  }

  return enforceTotalJsonLimit(next);
}

function enforceTotalJsonLimit(bundle: IdentityContextBundle): IdentityContextBundle {
  let serialized = JSON.stringify(bundle);

  if (serialized.length <= CONTEXT_LIMITS.TOTAL_JSON_CHARS) {
    return bundle;
  }

  const reduced: IdentityContextBundle = {
    userId: bundle.userId,
    profile: bundle.profile,
    moment: bundle.moment,
    chosenPath: bundle.chosenPath,
    mostRecentChosenPath: bundle.mostRecentChosenPath,
    reflection: bundle.reflection,
    checkIn: bundle.checkIn,
    counts: bundle.counts,
    checkInCount: bundle.checkInCount,
    currentSelf: bundle.currentSelf,
    pastCrossroad: bundle.pastCrossroad,
    selectedPastPath: bundle.selectedPastPath,
    chapterCandidates: bundle.chapterCandidates,
    recentMoments: bundle.recentMoments,
    currentSelfChosenPaths: bundle.currentSelfChosenPaths,
    currentSelfCheckIns: bundle.currentSelfCheckIns,
    pathThemes: bundle.pathThemes,
    checkIns: bundle.checkIns,
    identityUpdates: bundle.identityUpdates,
    futureSelves: bundle.futureSelves,
  };

  serialized = JSON.stringify(reduced);

  if (serialized.length <= CONTEXT_LIMITS.TOTAL_JSON_CHARS) {
    return reduced;
  }

  // Deep reduction: every profile that depends on checkIns/identityUpdates/
  // futureSelves/pathThemes (future_self, current_self, identity_prompt,
  // contradiction) must still receive a non-empty, shortened sample of each —
  // an oversized bundle elsewhere must never zero out the evidence a profile
  // actually needs to do its job.
  return {
    userId: bundle.userId,
    profile: bundle.profile,
    moment: bundle.moment,
    chosenPath: bundle.chosenPath,
    mostRecentChosenPath: bundle.mostRecentChosenPath,
    reflection: bundle.reflection,
    pastCrossroad: bundle.pastCrossroad,
    selectedPastPath: bundle.selectedPastPath,
    currentSelf: bundle.currentSelf,
    counts: bundle.counts,
    pathThemes: bundle.pathThemes?.slice(0, 10),
    recentMoments: truncateArray(bundle.recentMoments, 3)?.map((moment) => ({
      ...moment,
      description: truncateNullableText(moment.description, 150),
    })),
    currentSelfChosenPaths: truncateArray(bundle.currentSelfChosenPaths, 3)?.map(
      (path) => ({
        ...path,
        description: truncateText(path.description, 150),
      }),
    ),
    currentSelfCheckIns: truncateArray(bundle.currentSelfCheckIns, 3)?.map(
      (checkIn) => ({
        ...checkIn,
        reflection: truncateText(checkIn.reflection, 150),
        reality_summary: truncateText(checkIn.reality_summary, 150),
        identity_impact: truncateText(checkIn.identity_impact, 150),
        reflection_question: truncateNullableText(checkIn.reflection_question, 100),
        reflection_answer: truncateNullableText(checkIn.reflection_answer, 150),
      }),
    ),
    checkIns: truncateArray(bundle.checkIns, 5)?.map((checkIn) => ({
      ...checkIn,
      identity_impact: truncateText(checkIn.identity_impact, 150),
      reality_summary: truncateText(checkIn.reality_summary, 150),
    })),
    identityUpdates: truncateArray(bundle.identityUpdates, 5)?.map((update) => ({
      ...update,
      title: truncateText(update.title, 80),
      summary: truncateText(update.summary, 150),
    })),
    futureSelves: truncateArray(bundle.futureSelves, 5)?.map((futureSelf) => ({
      ...futureSelf,
      summary: truncateText(futureSelf.summary, 150),
    })),
  };
}

export function serializeContext(bundle: IdentityContextBundle): string {
  return JSON.stringify(enforceContextLimits(bundle), null, 2);
}
