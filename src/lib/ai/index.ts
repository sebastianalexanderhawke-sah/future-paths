export { buildIdentityContext, serializeContext, CONTEXT_LIMITS } from "@/lib/ai/context/builder";
export type {
  BuildContextOptions,
  BuildContextOverrides,
  ContextProfile,
  IdentityContextBundle,
} from "@/lib/ai/context/builder";

export {
  getIdentityEngineMode,
  resolveProviderForMode,
  shouldFallbackToMockOnError,
  getAnthropicApiKey,
} from "@/lib/ai/config";

export { runStructuredGeneration } from "@/lib/ai/orchestrator";
export { getIdentityAIProvider } from "@/lib/ai/providers";
export {
  getPromptDefinition,
  listPromptDefinitions,
  PROMPT_MIGRATION_ORDER,
  FINAL_AI_MIGRATION_PROMPT_ID,
  getFinalMigrationPromptId,
} from "@/lib/ai/prompts/registry";
export type { PromptId, PromptDefinition } from "@/lib/ai/prompts/registry";
export { getUsageTracker } from "@/lib/ai/usage";
export type {
  GenerationMetadata,
  GenerationResult,
  GenerationSuccess,
  IdentityEngineMode,
} from "@/lib/ai/types";
