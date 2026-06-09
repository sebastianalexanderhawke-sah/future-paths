export const PROMPT_MIGRATION_ORDER = [
  "crossroad.generate",
  "check_in.generate",
  "identity_update.generate",
  "future_self.discover",
  "current_self.generate",
  "identity_prompt.generate",
  "contradiction.detect",
  "past_path.generate",
  "alternate_self.generate",
  "timeline.generate",
] as const;

export type PromptId = (typeof PROMPT_MIGRATION_ORDER)[number];

export const FINAL_AI_MIGRATION_PROMPT_ID: PromptId = "timeline.generate";
