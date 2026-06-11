import type { ContradictionSourceRefs, ThemeChange } from "@/types/database";
import {
  CONTRADICTION_TYPES,
  FUTURE_SELF_STAGES,
  IDENTITY_PROMPT_TYPES,
  IDENTITY_UPDATE_TYPES,
  THEME_NAMES,
  type ContradictionType,
  type FutureSelfStage,
  type IdentityPromptType,
  type IdentityUpdateType,
  type ThemeName,
} from "@/types/enums";

const THEME_NAME_SET = new Set<string>(THEME_NAMES);

const THEME_SYNONYMS: Record<string, ThemeName> = {
  boundaries: "Independence",
  "self-protection": "Independence",
  autonomy: "Independence",
  closure: "Stability",
  patience: "Stability",
  security: "Stability",
  communication: "Connection",
  relationships: "Connection",
  relationship: "Connection",
  uncertainty: "Reflection",
  introspection: "Reflection",
  "self-discovery": "Curiosity",
  exploration: "Curiosity",
  discovery: "Curiosity",
  roots: "Belonging",
  purpose: "Reflection",
  adaptability: "Growth",
  honesty: "Courage",
  commitment: "Stability",
  healing: "Growth",
  "identity-shift": "Growth",
  "identity shift": "Growth",
  learning: "Growth",
  creation: "Creativity",
  community: "Belonging",
  mentor: "Leadership",
  bravery: "Courage",
};

function normalizeThemeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export function normalizeThemeName(value: unknown): ThemeName | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (THEME_NAME_SET.has(trimmed)) {
    return trimmed as ThemeName;
  }

  const caseInsensitiveMatch = THEME_NAMES.find(
    (theme) => theme.toLowerCase() === trimmed.toLowerCase(),
  );

  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  const synonym = THEME_SYNONYMS[normalizeThemeKey(trimmed)];

  return synonym ?? null;
}

export function normalizeThemesArray(themes: unknown): ThemeName[] {
  if (!Array.isArray(themes)) {
    return ["Reflection"];
  }

  const normalized = [
    ...new Set(
      themes.flatMap((theme) => {
        const mapped = normalizeThemeName(theme);
        return mapped ? [mapped] : [];
      }),
    ),
  ].slice(0, 3);

  return normalized.length > 0 ? normalized : ["Reflection"];
}

type ThemeChangeDirection = ThemeChange["direction"];

const DIRECTION_VALUES = new Set<string>(["strengthened", "emerging", "weakened"]);

const DIRECTION_SYNONYMS: Record<string, ThemeChangeDirection> = {
  strengthened: "strengthened",
  strengthening: "strengthened",
  stronger: "strengthened",
  increased: "strengthened",
  growing: "strengthened",
  emerging: "emerging",
  emerge: "emerging",
  new: "emerging",
  appeared: "emerging",
  weakened: "weakened",
  weakening: "weakened",
  weaker: "weakened",
  decreased: "weakened",
  fading: "weakened",
};

function normalizeThemeDirection(
  value: unknown,
  fallback: ThemeChangeDirection = "emerging",
): ThemeChangeDirection {
  if (typeof value !== "string") {
    return fallback;
  }

  const key = value.trim().toLowerCase();

  if (DIRECTION_VALUES.has(key)) {
    return key as ThemeChangeDirection;
  }

  return DIRECTION_SYNONYMS[key] ?? fallback;
}

export function normalizeThemeChangesArray(changes: unknown): ThemeChange[] {
  if (!Array.isArray(changes)) {
    return [{ theme: "Reflection", direction: "emerging" }];
  }

  const seen = new Set<ThemeName>();
  const normalized: ThemeChange[] = [];

  for (const [index, item] of changes.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const theme = normalizeThemeName(record.theme);

    if (!theme || seen.has(theme)) {
      continue;
    }

    const fallbackDirection: ThemeChangeDirection =
      index === 0 ? "strengthened" : "emerging";

    normalized.push({
      theme,
      direction: normalizeThemeDirection(record.direction, fallbackDirection),
    });
    seen.add(theme);

    if (normalized.length >= 3) {
      break;
    }
  }

  return normalized.length > 0
    ? normalized
    : [{ theme: "Reflection", direction: "emerging" }];
}

export function normalizeCheckInThemesInOutput(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const record = data as Record<string, unknown>;

  return {
    ...record,
    theme_changes: normalizeThemeChangesArray(record.theme_changes),
  };
}

export function normalizeCrossroadThemesInOutput(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const record = data as Record<string, unknown>;

  if (!Array.isArray(record.paths)) {
    return data;
  }

  return {
    ...record,
    paths: record.paths.map((path) => {
      if (!path || typeof path !== "object" || Array.isArray(path)) {
        return path;
      }

      const pathRecord = path as Record<string, unknown>;

      return {
        ...pathRecord,
        themes: normalizeThemesArray(pathRecord.themes),
      };
    }),
  };
}

const UPDATE_TYPE_SET = new Set<string>(IDENTITY_UPDATE_TYPES);

const UPDATE_TYPE_SYNONYMS: Record<string, IdentityUpdateType> = {
  shift: "reality_shift",
  "reality-shift": "reality_shift",
  reality: "reality_shift",
  emerging: "theme_emerging",
  "theme-emerging": "theme_emerging",
  "emerging-pattern": "theme_emerging",
  emerging_pattern: "theme_emerging",
  "theme-emergence": "theme_emerging",
  pattern: "pattern_strengthened",
  "pattern-strengthened": "pattern_strengthened",
  strengthened: "pattern_strengthened",
  "strengthened-pattern": "pattern_strengthened",
  "pattern-strengthening": "pattern_strengthened",
};

function normalizeUpdateTypeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeIdentityUpdateType(
  value: unknown,
): IdentityUpdateType | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (UPDATE_TYPE_SET.has(trimmed)) {
    return trimmed as IdentityUpdateType;
  }

  const key = normalizeUpdateTypeKey(trimmed);

  if (UPDATE_TYPE_SET.has(key)) {
    return key as IdentityUpdateType;
  }

  return UPDATE_TYPE_SYNONYMS[key] ?? null;
}

export function normalizeIdentityUpdateInOutput(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const record = data as Record<string, unknown>;
  const updateType = normalizeIdentityUpdateType(record.update_type);

  return {
    ...record,
    ...(updateType ? { update_type: updateType } : {}),
    themes: normalizeThemesArray(record.themes),
  };
}

const IDENTITY_PROMPT_TYPE_SET = new Set<string>(IDENTITY_PROMPT_TYPES);

const IDENTITY_PROMPT_TYPE_SYNONYMS: Record<string, IdentityPromptType> = {
  pattern_reflection: "pattern_probe",
  tension_exploration: "theme_reflection",
  identity_signal: "pattern_probe",
  reflection: "theme_reflection",
  self_reflection: "theme_reflection",
  identity_reflection: "theme_reflection",
  future_self_alignment: "future_alignment",
  alignment_probe: "future_alignment",
  identity_probe: "pattern_probe",
  "theme-reflection": "theme_reflection",
  "future-alignment": "future_alignment",
  "pattern-probe": "pattern_probe",
};

function normalizeIdentityPromptTypeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeIdentityPromptType(
  value: unknown,
): IdentityPromptType | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (IDENTITY_PROMPT_TYPE_SET.has(trimmed)) {
    return trimmed as IdentityPromptType;
  }

  const key = normalizeIdentityPromptTypeKey(trimmed);

  if (IDENTITY_PROMPT_TYPE_SET.has(key)) {
    return key as IdentityPromptType;
  }

  return IDENTITY_PROMPT_TYPE_SYNONYMS[key] ?? null;
}

export function normalizeIdentityPromptInOutput(data: unknown): unknown {
  if (!Array.isArray(data)) {
    return data;
  }

  return data.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }

    const record = item as Record<string, unknown>;
    const promptType = normalizeIdentityPromptType(record.prompt_type);

    return {
      ...record,
      ...(promptType ? { prompt_type: promptType } : {}),
    };
  });
}

const FUTURE_SELF_STAGE_SET = new Set<string>(FUTURE_SELF_STAGES);

const FUTURE_SELF_STAGE_SYNONYMS: Record<string, FutureSelfStage> = {
  developing: "emerging",
  forming: "possible",
  potential: "possible",
  nascent: "possible",
  tentative: "possible",
  established: "future_self",
  mature: "future_self",
  "future-self": "future_self",
  futureself: "future_self",
};

function normalizeFutureSelfStageKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeFutureSelfStage(value: unknown): FutureSelfStage | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (FUTURE_SELF_STAGE_SET.has(trimmed)) {
    return trimmed as FutureSelfStage;
  }

  const key = normalizeFutureSelfStageKey(trimmed);

  if (FUTURE_SELF_STAGE_SET.has(key)) {
    return key as FutureSelfStage;
  }

  const caseInsensitiveMatch = FUTURE_SELF_STAGES.find(
    (stage) => stage.toLowerCase() === key,
  );

  if (caseInsensitiveMatch) {
    return caseInsensitiveMatch;
  }

  return FUTURE_SELF_STAGE_SYNONYMS[key] ?? null;
}

export function normalizeFutureSelfInOutput(data: unknown): unknown {
  if (!Array.isArray(data)) {
    return data;
  }

  return data.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }

    const record = item as Record<string, unknown>;
    const stage = normalizeFutureSelfStage(record.stage);

    return {
      ...record,
      ...(stage ? { stage } : {}),
    };
  });
}

const CONTRADICTION_TYPE_SET = new Set<string>(CONTRADICTION_TYPES);

const CONTRADICTION_TYPE_SYNONYMS: Record<string, ContradictionType> = {
  approach_avoidance: "current_vs_future",
  values_conflict: "dual_future",
  identity_role_conflict: "stated_vs_lived",
  present_vs_future: "current_vs_future",
  pattern_vs_trajectory: "current_vs_future",
  internal_conflict: "stated_vs_lived",
  identity_tension: "current_vs_future",
  "current-vs-future": "current_vs_future",
  "dual-future": "dual_future",
  "stated-vs-lived": "stated_vs_lived",
};

function normalizeContradictionTypeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeContradictionType(
  value: unknown,
): ContradictionType | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (CONTRADICTION_TYPE_SET.has(trimmed)) {
    return trimmed as ContradictionType;
  }

  const key = normalizeContradictionTypeKey(trimmed);

  if (CONTRADICTION_TYPE_SET.has(key)) {
    return key as ContradictionType;
  }

  return CONTRADICTION_TYPE_SYNONYMS[key] ?? null;
}

function normalizeSourceRefIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function sourceRefsFromIdArray(
  ids: string[],
  contradictionType: ContradictionType | null,
): ContradictionSourceRefs {
  if (ids.length === 0) {
    return {};
  }

  switch (contradictionType) {
    case "dual_future":
      return { future_self_ids: ids };
    case "stated_vs_lived":
      if (ids.length >= 2) {
        return {
          current_self_id: ids[0],
          prompt_response_ids: ids.slice(1),
        };
      }

      return { prompt_response_ids: ids };
    case "current_vs_future":
      if (ids.length >= 2) {
        return {
          current_self_id: ids[0],
          future_self_ids: ids.slice(1),
        };
      }

      return { future_self_ids: ids };
    default:
      if (ids.length >= 2) {
        return {
          current_self_id: ids[0],
          future_self_ids: ids.slice(1),
        };
      }

      return { future_self_ids: ids };
  }
}

export function normalizeContradictionSourceRefs(
  value: unknown,
  contradictionType: ContradictionType | null,
): ContradictionSourceRefs | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    return {
      ...(typeof record.current_self_id === "string"
        ? { current_self_id: record.current_self_id }
        : {}),
      ...(Array.isArray(record.future_self_ids)
        ? { future_self_ids: normalizeSourceRefIds(record.future_self_ids) }
        : {}),
      ...(Array.isArray(record.prompt_response_ids)
        ? { prompt_response_ids: normalizeSourceRefIds(record.prompt_response_ids) }
        : {}),
    };
  }

  if (Array.isArray(value)) {
    return sourceRefsFromIdArray(normalizeSourceRefIds(value), contradictionType);
  }

  return null;
}

export function normalizeContradictionInOutput(data: unknown): unknown {
  if (!Array.isArray(data)) {
    return data;
  }

  return data.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }

    const record = item as Record<string, unknown>;
    const contradictionType = normalizeContradictionType(record.contradiction_type);
    const sourceRefs = normalizeContradictionSourceRefs(
      record.source_refs,
      contradictionType,
    );

    return {
      ...record,
      ...(contradictionType ? { contradiction_type: contradictionType } : {}),
      ...(sourceRefs !== null ? { source_refs: sourceRefs } : {}),
      themes: normalizeThemesArray(record.themes),
    };
  });
}

function normalizeTimelineEvidenceDraft(item: unknown, index: number): unknown {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return item;
  }

  const record = item as Record<string, unknown>;

  return {
    ...record,
    sort_priority:
      typeof record.sort_priority === "number" && Number.isFinite(record.sort_priority)
        ? Math.min(100, Math.max(0, Math.trunc(record.sort_priority)))
        : Math.max(0, 100 - index * 10),
  };
}

function normalizeTimelineChapterDraft(chapter: unknown): unknown {
  if (!chapter || typeof chapter !== "object" || Array.isArray(chapter)) {
    return chapter;
  }

  const record = chapter as Record<string, unknown>;
  const evidence = Array.isArray(record.evidence)
    ? record.evidence.map((item, index) => normalizeTimelineEvidenceDraft(item, index))
    : [];

  return {
    ...record,
    themes: normalizeThemesArray(record.themes),
    includes_current_self:
      typeof record.includes_current_self === "boolean" ? record.includes_current_self : false,
    strength:
      typeof record.strength === "number" && Number.isFinite(record.strength) && record.strength >= 0
        ? record.strength
        : 0,
    evidence,
  };
}

export function normalizeTimelineInOutput(data: unknown): unknown {
  if (!Array.isArray(data)) {
    return data;
  }

  return data.map((chapter) => normalizeTimelineChapterDraft(chapter));
}
