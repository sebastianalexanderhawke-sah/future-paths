export const PROMPT_MIGRATION_ORDER = [
  "crossroad.generate",
  "discovery_question.generate",
  "check_in.generate",
  "identity_update.generate",
  // Deprecated: Phase 4 replaced AI discovery with deterministic identity recognition.
  // Kept registered to avoid PromptId type cascade — no longer invoked.
  "future_self.discover",
  "forecast.generate",
  "current_self.generate",
  "identity_prompt.generate",
  "contradiction.detect",
  "past_path.generate",
  "alternate_self.generate",
  "monthly_identity_narrative.generate",
  "reflection_question.evaluate",
  "timeline.generate",
] as const;

export type PromptId = (typeof PROMPT_MIGRATION_ORDER)[number];

export const FINAL_AI_MIGRATION_PROMPT_ID: PromptId = "timeline.generate";
