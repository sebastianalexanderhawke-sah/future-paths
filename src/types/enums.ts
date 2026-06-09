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

export const FUTURE_SELF_STAGES = ["possible", "emerging", "future_self"] as const;
export type FutureSelfStage = (typeof FUTURE_SELF_STAGES)[number];

export const FUTURE_SELF_STATUSES = ["active", "faded"] as const;
export type FutureSelfStatus = (typeof FUTURE_SELF_STATUSES)[number];

export const FUTURE_SELF_EVENT_TYPES = [
  "emerged",
  "grew",
  "faded",
  "returned",
] as const;
export type FutureSelfEventType = (typeof FUTURE_SELF_EVENT_TYPES)[number];

export const IDENTITY_PROMPT_TYPES = [
  "theme_reflection",
  "future_alignment",
  "pattern_probe",
] as const;
export type IdentityPromptType = (typeof IDENTITY_PROMPT_TYPES)[number];

export const IDENTITY_PROMPT_STATUSES = [
  "pending",
  "answered",
  "dismissed",
] as const;
export type IdentityPromptStatus = (typeof IDENTITY_PROMPT_STATUSES)[number];

export const CONTRADICTION_TYPES = [
  "current_vs_future",
  "dual_future",
  "stated_vs_lived",
] as const;
export type ContradictionType = (typeof CONTRADICTION_TYPES)[number];

export const CONTRADICTION_STATUSES = [
  "active",
  "softened",
  "resolved",
  "faded",
] as const;
export type ContradictionStatus = (typeof CONTRADICTION_STATUSES)[number];

export const CONTRADICTION_EVENT_TYPES = [
  "detected",
  "intensified",
  "softened",
  "resolved",
  "faded",
] as const;
export type ContradictionEventType = (typeof CONTRADICTION_EVENT_TYPES)[number];

export const ALTERNATE_SELF_STATUSES = ["active", "archived"] as const;
export type AlternateSelfStatus = (typeof ALTERNATE_SELF_STATUSES)[number];

export const PAST_CROSSROAD_STATUSES = ["active", "archived"] as const;
export type PastCrossroadStatus = (typeof PAST_CROSSROAD_STATUSES)[number];

export const LIFE_CHAPTER_STATUSES = ["active", "archived"] as const;
export type LifeChapterStatus = (typeof LIFE_CHAPTER_STATUSES)[number];

export const LIFE_CHAPTER_EVIDENCE_TYPES = [
  "moment",
  "path",
  "check_in",
  "identity_update",
  "future_self",
  "contradiction",
  "alternate_self",
] as const;
export type LifeChapterEvidenceType = (typeof LIFE_CHAPTER_EVIDENCE_TYPES)[number];
