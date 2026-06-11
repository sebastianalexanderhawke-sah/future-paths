import type { ThemeChange } from "@/types/database";
import {
  IDENTITY_UPDATE_TYPES,
  THEME_NAMES,
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
