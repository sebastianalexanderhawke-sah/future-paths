export const MOMENT_STATUSES = ["active", "archived"] as const;
export type MomentStatus = (typeof MOMENT_STATUSES)[number];

export const TIMELINE_EVENT_TYPES = [
  "moment_created",
  "paths_generated",
  "path_chosen",
  "check_in_recorded",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const TIMELINE_REFERENCE_TYPES = ["moment", "path", "check_in"] as const;
export type TimelineReferenceType = (typeof TIMELINE_REFERENCE_TYPES)[number];

export const THEME_NAMES = [
  "Connection",
  "Independence",
  "Curiosity",
  "Stability",
  "Creativity",
  "Growth",
  "Belonging",
  "Leadership",
  "Reflection",
  "Courage",
] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
