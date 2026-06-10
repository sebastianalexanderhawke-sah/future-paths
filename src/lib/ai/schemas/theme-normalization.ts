import { THEME_NAMES, type ThemeName } from "@/types/enums";

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
