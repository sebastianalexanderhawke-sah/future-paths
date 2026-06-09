import type {
  AlternateSelf,
  CheckIn,
  Contradiction,
  CurrentSelf,
  FutureSelf,
  IdentityUpdate,
  Moment,
  Path,
} from "@/types/database";
import type { LifeChapterEvidenceType, ThemeName } from "@/types/enums";

export type ChapterEvidenceDraft = {
  evidence_type: LifeChapterEvidenceType;
  evidence_id: string;
  label: string;
  occurred_at: string;
  sort_priority: number;
};

export type MockLifeChapterDraft = {
  title: string;
  period_label: string;
  starts_at: string;
  ends_at: string;
  summary: string;
  themes: ThemeName[];
  includes_current_self: boolean;
  evidence: ChapterEvidenceDraft[];
  strength: number;
};

export type TimelineGenerationInput = {
  moments: Pick<Moment, "id" | "title" | "created_at" | "status">[];
  chosenPaths: Pick<
    Path,
    "id" | "moment_id" | "description" | "themes" | "chosen_at" | "created_at"
  >[];
  checkIns: Pick<
    CheckIn,
    "id" | "reflection" | "theme_changes" | "identity_impact" | "created_at"
  >[];
  identityUpdates: Pick<
    IdentityUpdate,
    "id" | "title" | "summary" | "themes" | "created_at"
  >[];
  futureSelves: Pick<
    FutureSelf,
    "id" | "name" | "momentum" | "themes" | "status" | "updated_at"
  >[];
  contradictions: Pick<
    Contradiction,
    "id" | "title" | "themes" | "intensity" | "status" | "updated_at"
  >[];
  alternateSelves: Pick<
    AlternateSelf,
    "id" | "name" | "themes" | "status" | "updated_at" | "past_crossroad_id"
  >[];
  crossroadSnippets: Map<string, string>;
  currentSelf: Pick<CurrentSelf, "headline" | "summary" | "themes"> | null;
};

type InternalEvidence = ChapterEvidenceDraft & {
  themeScores: Map<ThemeName, number>;
  isMoment: boolean;
  isCheckInOrUpdate: boolean;
};

const MAX_CHAPTERS = 8;
const MIN_THEME_SCORE = 4;
const MIN_EVIDENCE_COUNT = 3;

const NARRATIVE_TITLES: Partial<Record<ThemeName, string>> = {
  Growth: "Stretching Into Something New",
  Independence: "Finding Your Own Way",
  Connection: "Seeking Closer Bonds",
  Stability: "Grounding What Matters",
  Courage: "Stepping Into the Unknown",
  Curiosity: "Following What Intrigued You",
  Creativity: "Making Room to Create",
  Belonging: "Searching for Where You Fit",
  Leadership: "Learning to Lead From Within",
  Reflection: "Turning Inward to Understand",
};

const PAIR_TITLES: Partial<Record<string, string>> = {
  "Independence-Growth": "Growing Into Your Own Path",
  "Stability-Growth": "The Pull Between Stability and Change",
  "Connection-Independence": "Balancing Closeness and Autonomy",
  "Courage-Stability": "Choosing Between Safety and Risk",
  "Growth-Reflection": "Learning Through Looking Back",
  "Belonging-Independence": "Wanting Roots While Moving Forward",
};

function themeChangeWeight(direction: CheckIn["theme_changes"][number]["direction"]): number {
  if (direction === "strengthened") {
    return 3;
  }

  if (direction === "emerging") {
    return 2;
  }

  return 1;
}

function getSeasonKey(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month === 11) {
    return `winter-${year + 1}`;
  }

  if (month <= 1) {
    return `winter-${year}`;
  }

  if (month <= 4) {
    return `spring-${year}`;
  }

  if (month <= 7) {
    return `summer-${year}`;
  }

  return `fall-${year}`;
}

function seasonBounds(seasonKey: string): {
  period_label: string;
  starts_at: string;
  ends_at: string;
} {
  const [season, yearText] = seasonKey.split("-");
  const year = Number(yearText);

  if (season === "winter") {
    return {
      period_label: `Winter ${year}`,
      starts_at: `${year - 1}-12-01`,
      ends_at: `${year}-02-${year % 4 === 0 ? "29" : "28"}`,
    };
  }

  if (season === "spring") {
    return {
      period_label: `Spring ${year}`,
      starts_at: `${year}-03-01`,
      ends_at: `${year}-05-31`,
    };
  }

  if (season === "summer") {
    return {
      period_label: `Summer ${year}`,
      starts_at: `${year}-06-01`,
      ends_at: `${year}-08-31`,
    };
  }

  return {
    period_label: `Fall ${year}`,
    starts_at: `${year}-09-01`,
    ends_at: `${year}-11-30`,
  };
}

function mergePeriodLabel(keys: string[]): string {
  if (keys.length === 1) {
    return seasonBounds(keys[0]).period_label;
  }

  const years = [...new Set(keys.map((key) => Number(key.split("-")[1])))].sort(
    (a, b) => a - b,
  );

  if (years.length === 1) {
    return `Early ${years[0]}`;
  }

  return `${years[0]}–${years[years.length - 1]}`;
}

function mergeDateRange(keys: string[]): { starts_at: string; ends_at: string } {
  const bounds = keys.map((key) => seasonBounds(key));
  bounds.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return {
    starts_at: bounds[0].starts_at,
    ends_at: bounds[bounds.length - 1].ends_at,
  };
}

function formatThemeList(themes: ThemeName[]): string {
  if (themes.length === 0) {
    return "recurring patterns";
  }

  if (themes.length === 1) {
    return themes[0].toLowerCase();
  }

  return `${themes[0].toLowerCase()} and ${themes[1].toLowerCase()}`;
}

function buildNarrativeTitle(topThemes: ThemeName[]): string {
  if (topThemes.length >= 2) {
    const pairKey = `${topThemes[0]}-${topThemes[1]}`;
    const reverseKey = `${topThemes[1]}-${topThemes[0]}`;
    const pairTitle = PAIR_TITLES[pairKey] ?? PAIR_TITLES[reverseKey];

    if (pairTitle) {
      return pairTitle;
    }
  }

  const primary = topThemes[0];
  if (primary && NARRATIVE_TITLES[primary]) {
    return NARRATIVE_TITLES[primary];
  }

  return "A Period of Becoming";
}

function aggregateThemeScores(items: InternalEvidence[]): Map<ThemeName, number> {
  const scores = new Map<ThemeName, number>();

  for (const item of items) {
    for (const [theme, score] of item.themeScores) {
      scores.set(theme, (scores.get(theme) ?? 0) + score);
    }
  }

  return scores;
}

function topThemes(scores: Map<ThemeName, number>, limit = 3): ThemeName[] {
  return [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([theme]) => theme);
}

function meetsQualityGate(items: InternalEvidence[]): boolean {
  if (items.length < MIN_EVIDENCE_COUNT) {
    const momentCount = items.filter((item) => item.isMoment).length;
    const checkInOrUpdateCount = items.filter((item) => item.isCheckInOrUpdate).length;

    if (!(momentCount >= 1 && checkInOrUpdateCount >= 2)) {
      return false;
    }
  }

  const scores = aggregateThemeScores(items);
  const topScore = Math.max(0, ...scores.values());

  return topScore >= MIN_THEME_SCORE;
}

function chapterStrength(items: InternalEvidence[]): number {
  const scores = aggregateThemeScores(items);
  const topScore = Math.max(0, ...scores.values());
  return topScore + items.length;
}

function buildSummary(input: {
  themes: ThemeName[];
  includesCurrentSelf: boolean;
  currentSelf: TimelineGenerationInput["currentSelf"];
}): string {
  const themePhrase = formatThemeList(input.themes);
  const base = `You may have been navigating ${themePhrase} during this period — not as a single decision, but as a recurring thread across your moments, check-ins, and reflections. Patterns may have strengthened quietly, showing up in what you noticed about yourself and what you chose to explore next.`;

  if (!input.includesCurrentSelf || !input.currentSelf) {
    return base;
  }

  return `${base} Today you tend toward ${input.currentSelf.headline.toLowerCase()} — a present snapshot that may sit alongside, not replace, what this chapter describes.`;
}

function buildEvidenceItems(input: TimelineGenerationInput): InternalEvidence[] {
  const items: InternalEvidence[] = [];

  for (const moment of input.moments) {
    if (moment.status !== "active") {
      continue;
    }

    items.push({
      evidence_type: "moment",
      evidence_id: moment.id,
      label: moment.title,
      occurred_at: moment.created_at,
      sort_priority: 80,
      themeScores: new Map(),
      isMoment: true,
      isCheckInOrUpdate: false,
    });
  }

  for (const path of input.chosenPaths) {
    const occurredAt = path.chosen_at ?? path.created_at;
    const themeScores = new Map<ThemeName, number>();

    for (const theme of path.themes) {
      themeScores.set(theme, 1);
    }

    items.push({
      evidence_type: "path",
      evidence_id: path.id,
      label: path.description,
      occurred_at: occurredAt,
      sort_priority: 70,
      themeScores,
      isMoment: false,
      isCheckInOrUpdate: false,
    });
  }

  for (const checkIn of input.checkIns) {
    const themeScores = new Map<ThemeName, number>();

    for (const change of checkIn.theme_changes) {
      themeScores.set(
        change.theme,
        (themeScores.get(change.theme) ?? 0) + themeChangeWeight(change.direction) * 3,
      );
    }

    items.push({
      evidence_type: "check_in",
      evidence_id: checkIn.id,
      label: checkIn.identity_impact || checkIn.reflection,
      occurred_at: checkIn.created_at,
      sort_priority: 100,
      themeScores,
      isMoment: false,
      isCheckInOrUpdate: true,
    });
  }

  for (const update of input.identityUpdates) {
    const themeScores = new Map<ThemeName, number>();

    for (const theme of update.themes) {
      themeScores.set(theme, (themeScores.get(theme) ?? 0) + 2);
    }

    items.push({
      evidence_type: "identity_update",
      evidence_id: update.id,
      label: update.title,
      occurred_at: update.created_at,
      sort_priority: 90,
      themeScores,
      isMoment: false,
      isCheckInOrUpdate: true,
    });
  }

  for (const futureSelf of input.futureSelves) {
    if (futureSelf.status !== "active") {
      continue;
    }

    const weight = 1 + futureSelf.momentum / 50;
    const themeScores = new Map<ThemeName, number>();

    for (const theme of futureSelf.themes) {
      themeScores.set(theme, (themeScores.get(theme) ?? 0) + weight);
    }

    items.push({
      evidence_type: "future_self",
      evidence_id: futureSelf.id,
      label: futureSelf.name,
      occurred_at: futureSelf.updated_at,
      sort_priority: 60,
      themeScores,
      isMoment: false,
      isCheckInOrUpdate: false,
    });
  }

  for (const contradiction of input.contradictions) {
    if (contradiction.status !== "active" && contradiction.status !== "softened") {
      continue;
    }

    const weight = 1 + contradiction.intensity / 100;
    const themeScores = new Map<ThemeName, number>();

    for (const theme of contradiction.themes) {
      themeScores.set(theme, (themeScores.get(theme) ?? 0) + weight);
    }

    items.push({
      evidence_type: "contradiction",
      evidence_id: contradiction.id,
      label: contradiction.title,
      occurred_at: contradiction.updated_at,
      sort_priority: 50,
      themeScores,
      isMoment: false,
      isCheckInOrUpdate: false,
    });
  }

  for (const alternateSelf of input.alternateSelves) {
    if (alternateSelf.status !== "active") {
      continue;
    }

    const themeScores = new Map<ThemeName, number>();

    for (const theme of alternateSelf.themes) {
      themeScores.set(theme, (themeScores.get(theme) ?? 0) + 2.5);
    }

    const snippet = input.crossroadSnippets.get(alternateSelf.past_crossroad_id);
    const label = snippet
      ? `${alternateSelf.name} · ${snippet}`
      : alternateSelf.name;

    items.push({
      evidence_type: "alternate_self",
      evidence_id: alternateSelf.id,
      label,
      occurred_at: alternateSelf.updated_at,
      sort_priority: 75,
      themeScores,
      isMoment: false,
      isCheckInOrUpdate: false,
    });
  }

  return items;
}

function assignToSeasons(items: InternalEvidence[]): Map<string, InternalEvidence[]> {
  const buckets = new Map<string, InternalEvidence[]>();

  for (const item of items) {
    const key = getSeasonKey(item.occurred_at);
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  return buckets;
}

function tryMergeAdjacent(
  seasonKeys: string[],
  buckets: Map<string, InternalEvidence[]>,
): { keys: string[]; items: InternalEvidence[] }[] {
  if (seasonKeys.length === 0) {
    return [];
  }

  const merged: { keys: string[]; items: InternalEvidence[] }[] = [];
  let currentKeys = [seasonKeys[0]];
  let currentItems = [...(buckets.get(seasonKeys[0]) ?? [])];

  for (let index = 1; index < seasonKeys.length; index += 1) {
    const key = seasonKeys[index];
    const items = buckets.get(key) ?? [];

    if (meetsQualityGate(currentItems)) {
      merged.push({ keys: currentKeys, items: currentItems });
      currentKeys = [key];
      currentItems = [...items];
      continue;
    }

    const combined = [...currentItems, ...items];

    if (meetsQualityGate(combined)) {
      currentKeys.push(key);
      currentItems = combined;
    } else {
      currentKeys = [key];
      currentItems = [...items];
    }
  }

  merged.push({ keys: currentKeys, items: currentItems });
  return merged;
}

function toChapterDraft(input: {
  keys: string[];
  items: InternalEvidence[];
  includesCurrentSelf: boolean;
  currentSelf: TimelineGenerationInput["currentSelf"];
}): MockLifeChapterDraft | null {
  if (!meetsQualityGate(input.items)) {
    return null;
  }

  const themeScores = aggregateThemeScores(input.items);
  const themes = topThemes(themeScores);
  const { starts_at, ends_at } = mergeDateRange(input.keys);

  const evidence: ChapterEvidenceDraft[] = [...input.items]
    .sort((a, b) => {
      if (b.sort_priority !== a.sort_priority) {
        return b.sort_priority - a.sort_priority;
      }

      return b.occurred_at.localeCompare(a.occurred_at);
    })
    .slice(0, 8)
    .map((item) => ({
      evidence_type: item.evidence_type,
      evidence_id: item.evidence_id,
      label: item.label,
      occurred_at: item.occurred_at,
      sort_priority: item.sort_priority,
    }));

  return {
    title: buildNarrativeTitle(themes),
    period_label: mergePeriodLabel(input.keys),
    starts_at,
    ends_at,
    summary: buildSummary({
      themes,
      includesCurrentSelf: input.includesCurrentSelf,
      currentSelf: input.currentSelf,
    }),
    themes,
    includes_current_self: input.includesCurrentSelf,
    evidence,
    strength: chapterStrength(input.items),
  };
}

export function generateMockLifeChapters(
  input: TimelineGenerationInput,
): MockLifeChapterDraft[] {
  const evidenceItems = buildEvidenceItems(input);

  if (evidenceItems.length === 0) {
    return [];
  }

  const buckets = assignToSeasons(evidenceItems);
  const seasonKeys = [...buckets.keys()].sort((a, b) => {
    const aStart = seasonBounds(a).starts_at;
    const bStart = seasonBounds(b).starts_at;
    return aStart.localeCompare(bStart);
  });

  const mergedBuckets = tryMergeAdjacent(seasonKeys, buckets);
  const drafts: MockLifeChapterDraft[] = [];

  for (const bucket of mergedBuckets) {
    const draft = toChapterDraft({
      keys: bucket.keys,
      items: bucket.items,
      includesCurrentSelf: false,
      currentSelf: input.currentSelf,
    });

    if (draft) {
      drafts.push(draft);
    }
  }

  if (drafts.length === 0) {
    return [];
  }

  drafts.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const capped = drafts.length > MAX_CHAPTERS
    ? [...drafts].sort((a, b) => b.strength - a.strength).slice(0, MAX_CHAPTERS).sort(
        (a, b) => a.starts_at.localeCompare(b.starts_at),
      )
    : drafts;

  const latestIndex = capped.length - 1;
  capped[latestIndex] = {
    ...capped[latestIndex],
    includes_current_self: input.currentSelf !== null,
    summary: buildSummary({
      themes: capped[latestIndex].themes,
      includesCurrentSelf: input.currentSelf !== null,
      currentSelf: input.currentSelf,
    }),
  };

  return capped;
}
