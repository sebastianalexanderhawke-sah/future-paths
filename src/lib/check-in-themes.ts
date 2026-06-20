import {
  CHECK_IN_POSITIVE_THEME_NAMES,
  CHECK_IN_THEME_NAMES,
  DIFFICULT_THEME_DIRECTIONS,
  DIFFICULT_THEME_NAMES,
  POSITIVE_THEME_DIRECTIONS,
  THEME_NAMES,
  type CheckInThemeName,
  type DifficultThemeName,
  type ThemeChangeDirection,
  type ThemeName,
} from "@/types/enums";

const DIFFICULT_THEME_SET = new Set<string>(DIFFICULT_THEME_NAMES);
const POSITIVE_DIRECTION_SET = new Set<string>(POSITIVE_THEME_DIRECTIONS);
const DIFFICULT_DIRECTION_SET = new Set<string>(DIFFICULT_THEME_DIRECTIONS);
const THEME_NAME_SET = new Set<string>(THEME_NAMES);

export function isDifficultCheckInTheme(theme: string): theme is DifficultThemeName {
  return DIFFICULT_THEME_SET.has(theme);
}

/** True for the growth-oriented vocabulary (THEME_NAMES) — false for difficult themes. */
export function isPositiveThemeName(theme: string): theme is ThemeName {
  return THEME_NAME_SET.has(theme);
}

/**
 * Filters a mixed positive+difficult theme list (e.g. Current Self's themes)
 * down to the positive-only vocabulary required by schemas that haven't been
 * widened to accept difficult themes (paths, future selves, contradictions,
 * identity prompts).
 */
export function toPositiveThemes(themes: readonly string[]): ThemeName[] {
  return themes.filter(isPositiveThemeName);
}

export function isCheckInThemeName(value: string): value is CheckInThemeName {
  return (CHECK_IN_THEME_NAMES as readonly string[]).includes(value);
}

export function isValidDirectionForTheme(
  theme: CheckInThemeName,
  direction: string,
): direction is ThemeChangeDirection {
  if (isDifficultCheckInTheme(theme)) {
    return DIFFICULT_DIRECTION_SET.has(direction);
  }
  return POSITIVE_DIRECTION_SET.has(direction);
}

export const CHECK_IN_POSITIVE_THEMES_PROMPT_TEXT =
  CHECK_IN_POSITIVE_THEME_NAMES.join(", ");

export const CHECK_IN_DIFFICULT_THEMES_PROMPT_TEXT = DIFFICULT_THEME_NAMES.join(", ");
