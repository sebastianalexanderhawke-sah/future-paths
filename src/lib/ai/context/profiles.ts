export const CONTEXT_PROFILES = [
  "crossroad",
  "discovery_question",
  "check_in",
  "identity_update",
  "future_self",
  "forecast",
  "current_self",
  // Behavior Engine v4 (phase 4): Current Self generated from the Identity
  // Brief alone. The legacy "current_self" profile stays intact as the
  // reversible migration boundary (CURRENT_SELF_ENGINE=legacy).
  "current_self_brief",
  "identity_prompt",
  "contradiction",
  "past_alternative_path",
  "alternate_self",
  "timeline",
  "monthly_identity_narrative",
  "reflection_question",
] as const;

export type ContextProfile = (typeof CONTEXT_PROFILES)[number];

import type { IdentityBrief } from "@/lib/identity-brief";

export type BuildContextOverrides = {
  momentId?: string;
  /** Pre-built Identity Brief for brief-based profiles — skips the loader's
   *  own ledger fetch when the caller already built one this request. */
  identityBrief?: IdentityBrief;
  pathId?: string;
  reflection?: string;
  realitySummary?: string;
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
