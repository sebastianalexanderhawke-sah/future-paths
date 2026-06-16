import {
  CHECK_IN_POSITIVE_THEME_NAMES,
  CHECK_IN_THEME_NAMES,
  DIFFICULT_THEME_DIRECTIONS,
  DIFFICULT_THEME_NAMES,
  POSITIVE_THEME_DIRECTIONS,
  type CheckInThemeName,
  type DifficultThemeName,
  type ThemeChangeDirection,
} from "@/types/enums";

const DIFFICULT_THEME_SET = new Set<string>(DIFFICULT_THEME_NAMES);
const POSITIVE_DIRECTION_SET = new Set<string>(POSITIVE_THEME_DIRECTIONS);
const DIFFICULT_DIRECTION_SET = new Set<string>(DIFFICULT_THEME_DIRECTIONS);

export function isDifficultCheckInTheme(theme: string): theme is DifficultThemeName {
  return DIFFICULT_THEME_SET.has(theme);
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
