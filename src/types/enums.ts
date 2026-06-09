export const MOMENT_STATUSES = ["active", "archived"] as const;
export type MomentStatus = (typeof MOMENT_STATUSES)[number];

export const TIMELINE_EVENT_TYPES = [
  "moment_created",
  "paths_generated",
  "path_chosen",
  "check_in_recorded",
  "identity_update",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const TIMELINE_REFERENCE_TYPES = [
  "moment",
  "path",
  "check_in",
  "identity_update",
] as const;
export type TimelineReferenceType = (typeof TIMELINE_REFERENCE_TYPES)[number];

export const IDENTITY_UPDATE_TYPES = [
  "reality_shift",
  "theme_emerging",
  "pattern_strengthened",
] as const;
export type IdentityUpdateType = (typeof IDENTITY_UPDATE_TYPES)[number];

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
