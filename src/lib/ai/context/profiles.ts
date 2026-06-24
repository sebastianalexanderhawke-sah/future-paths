export const CONTEXT_PROFILES = [
  "crossroad",
  "discovery_question",
  "check_in",
  "identity_update",
  "future_self",
  "forecast",
  "current_self",
  "identity_prompt",
  "contradiction",
  "past_alternative_path",
  "alternate_self",
  "timeline",
  "monthly_identity_narrative",
] as const;

export type ContextProfile = (typeof CONTEXT_PROFILES)[number];

export type BuildContextOverrides = {
  momentId?: string;
  pathId?: string;
  reflection?: string;
  checkInId?: string;
  crossroadId?: string;
  selectedPathId?: string;
  selectedPathTitle?: string;
  situationText?: string;
  situationGoal?: "decision" | "forecast";
  additionalContext?: string;
  checkInHistory?: string[];
  riskFocusThemes?: string[];
  reflectionQA?: {
    question: string;
    answer: string;
    checkInReflection: string;
    momentTitle: string;
  };
};

export type BuildContextOptions = {
  userId: string;
  profile: ContextProfile;
  overrides?: BuildContextOverrides;
};
