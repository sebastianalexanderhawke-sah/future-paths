import { THEME_NAMES, type ThemeName } from "@/types/enums";

export type ThemeColorSet = {
  primary: string;
  secondary: string;
  soft: string;
  softDark: string;
  glow: string;
};

export const THEME_CSS_KEYS: Record<ThemeName, string> = {
  Connection: "connection",
  Independence: "independence",
  Curiosity: "curiosity",
  Stability: "stability",
  Creativity: "creativity",
  Growth: "growth",
  Belonging: "belonging",
  Leadership: "leadership",
  Reflection: "reflection",
  Courage: "courage",
};

export const THEME_COLORS: Record<ThemeName, ThemeColorSet> = {
  Connection: {
    primary: "#B85A4E",
    secondary: "#E8A598",
    soft: "#F9EBE8",
    softDark: "rgb(42 30 28 / 0.8)",
    glow: "#B85A4E",
  },
  Independence: {
    primary: "#4A6B8A",
    secondary: "#8BAFC8",
    soft: "#E8EEF4",
    softDark: "rgb(26 32 40 / 0.85)",
    glow: "#4A6B8A",
  },
  Curiosity: {
    primary: "#6E5494",
    secondary: "#A88BD4",
    soft: "#F0EBF7",
    softDark: "rgb(34 28 42 / 0.85)",
    glow: "#6E5494",
  },
  Stability: {
    primary: "#4F7268",
    secondary: "#8FB5A8",
    soft: "#E8F0ED",
    softDark: "rgb(26 34 31 / 0.85)",
    glow: "#4F7268",
  },
  Creativity: {
    primary: "#A84E7A",
    secondary: "#D49AB8",
    soft: "#F9EBF2",
    softDark: "rgb(40 26 34 / 0.85)",
    glow: "#A84E7A",
  },
  Growth: {
    primary: "#3D8260",
    secondary: "#7AB89A",
    soft: "#E8F4ED",
    softDark: "rgb(26 34 28 / 0.85)",
    glow: "#3D8260",
  },
  Belonging: {
    primary: "#9A7344",
    secondary: "#C4A078",
    soft: "#F5EDE3",
    softDark: "rgb(36 30 24 / 0.85)",
    glow: "#9A7344",
  },
  Leadership: {
    primary: "#7A5C18",
    secondary: "#C4A050",
    soft: "#F5F0E3",
    softDark: "rgb(34 30 20 / 0.85)",
    glow: "#7A5C18",
  },
  Reflection: {
    primary: "#5C6370",
    secondary: "#8B929E",
    soft: "#EEEFF2",
    softDark: "rgb(26 28 32 / 0.85)",
    glow: "#5C6370",
  },
  Courage: {
    primary: "#B84E32",
    secondary: "#D88468",
    soft: "#F9EBE6",
    softDark: "rgb(40 26 22 / 0.85)",
    glow: "#B84E32",
  },
};

export const IDENTITY_STATE_COLORS = {
  strengthened: {
    light: "#4A8F6A",
    dark: "#6BB892",
  },
  emerging: {
    light: "#7B5EA7",
    dark: "#A88BD4",
  },
  weakened: {
    light: "#A8A29E",
    dark: "#78716C",
  },
  contradictionDetected: {
    light: "#B45309",
    dark: "#D97706",
  },
  contradictionResolved: {
    light: "#5A7A6E",
    dark: "#7A9E8E",
  },
  momentumIncreasingStart: {
    light: "#3D8260",
    dark: "#6BB892",
  },
  momentumIncreasingEnd: {
    light: "#6E5494",
    dark: "#A88BD4",
  },
  momentumDecreasingStart: {
    light: "#A8A29E",
    dark: "#78716C",
  },
  momentumDecreasingEnd: {
    light: "#78716C",
    dark: "#57534E",
  },
} as const;

export type IdentityStateColorKey = keyof typeof IDENTITY_STATE_COLORS;

export function getThemeCssVar(theme: ThemeName, token: "primary" | "soft" | "secondary" | "glow") {
  const key = THEME_CSS_KEYS[theme];
  return `var(--theme-${key}-${token})`;
}

export function isThemeName(value: string): value is ThemeName {
  return THEME_NAMES.includes(value as ThemeName);
}
