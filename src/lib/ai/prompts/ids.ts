export const PROMPT_MIGRATION_ORDER = [
  "crossroad.generate",
  // Situations v3.1: internal set-level destination audit for generated
  // paths. Validation-only — its output is never shown to the user.
  "path_set.audit",
  "discovery_question.generate",
  "check_in.generate",
  "identity_update.generate",
  // Deprecated: Phase 4 replaced AI discovery with deterministic identity recognition.
  // Kept registered to avoid PromptId type cascade — no longer invoked.
  "future_self.discover",
  "forecast.generate",
  "current_self.generate",
  // Behavior Engine v4 (phase 4): Current Self generated from the Identity
  // Brief. "current_self.generate" above stays registered as the reversible
  // legacy path (CURRENT_SELF_ENGINE=legacy).
  "current_self.generate_from_brief",
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
