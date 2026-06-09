export const CONTEXT_PROFILES = [
  "crossroad",
  "check_in",
  "identity_update",
  "future_self",
  "current_self",
  "identity_prompt",
  "contradiction",
  "past_alternative_path",
  "alternate_self",
  "timeline",
] as const;

export type ContextProfile = (typeof CONTEXT_PROFILES)[number];

export type BuildContextOverrides = {
  momentId?: string;
  pathId?: string;
  reflection?: string;
  crossroadId?: string;
  selectedPathId?: string;
};

export type BuildContextOptions = {
  userId: string;
  profile: ContextProfile;
  overrides?: BuildContextOverrides;
};
