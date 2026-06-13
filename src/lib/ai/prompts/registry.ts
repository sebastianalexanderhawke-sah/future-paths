import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import { parsePromptOutput } from "@/lib/ai/schemas";
import { alternateSelfGenerateV1 } from "@/lib/ai/prompts/alternate_self.generate.v1";
import { checkInGenerateV1 } from "@/lib/ai/prompts/check_in.generate.v1";
import { contradictionDetectV1 } from "@/lib/ai/prompts/contradiction.detect.v1";
import { crossroadGenerateV1 } from "@/lib/ai/prompts/crossroad.generate.v1";
import { discoveryQuestionGenerateV1 } from "@/lib/ai/prompts/discovery_question.generate.v1";
import { currentSelfGenerateV1 } from "@/lib/ai/prompts/current_self.generate.v1";
import { forecastGenerateV1 } from "@/lib/ai/prompts/forecast.generate.v1";
import { futureSelfDiscoverV1 } from "@/lib/ai/prompts/future_self.discover.v1";
import { identityPromptGenerateV1 } from "@/lib/ai/prompts/identity_prompt.generate.v1";
import { identityUpdateGenerateV1 } from "@/lib/ai/prompts/identity_update.generate.v1";
import {
  FINAL_AI_MIGRATION_PROMPT_ID,
  PROMPT_MIGRATION_ORDER,
  type PromptId,
} from "@/lib/ai/prompts/ids";
import { pastPathGenerateV1 } from "@/lib/ai/prompts/past_path.generate.v1";
import {
  buildSystemPromptForModule,
  type PromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { timelineGenerateV1 } from "@/lib/ai/prompts/timeline.generate.v1";

export type PromptDefinition = {
  promptId: PromptId;
  promptVersion: string;
  buildSystemPrompt: () => string;
  buildUserPrompt: (context: IdentityContextBundle) => string;
  parseOutput: (data: unknown) => unknown;
};

function registerPrompt(module: PromptModule): PromptDefinition {
  return {
    promptId: module.promptId as PromptId,
    promptVersion: module.promptVersion,
    buildSystemPrompt: () => buildSystemPromptForModule(module),
    buildUserPrompt: module.buildUserPrompt,
    parseOutput: (data: unknown) => parsePromptOutput(module.promptId as PromptId, data),
  };
}

const PROMPT_REGISTRY: Record<PromptId, PromptDefinition> = {
  "crossroad.generate": registerPrompt(crossroadGenerateV1),
  "discovery_question.generate": registerPrompt(discoveryQuestionGenerateV1),
  "check_in.generate": registerPrompt(checkInGenerateV1),
  "identity_update.generate": registerPrompt(identityUpdateGenerateV1),
  "future_self.discover": registerPrompt(futureSelfDiscoverV1),
  "forecast.generate": registerPrompt(forecastGenerateV1),
  "current_self.generate": registerPrompt(currentSelfGenerateV1),
  "identity_prompt.generate": registerPrompt(identityPromptGenerateV1),
  "contradiction.detect": registerPrompt(contradictionDetectV1),
  "past_path.generate": registerPrompt(pastPathGenerateV1),
  "alternate_self.generate": registerPrompt(alternateSelfGenerateV1),
  "timeline.generate": registerPrompt(timelineGenerateV1),
};

export {
  FINAL_AI_MIGRATION_PROMPT_ID,
  PROMPT_MIGRATION_ORDER,
  type PromptId,
} from "@/lib/ai/prompts/ids";

export function getPromptDefinition(promptId: PromptId): PromptDefinition {
  return PROMPT_REGISTRY[promptId];
}

export function listPromptDefinitions(): PromptDefinition[] {
  return PROMPT_MIGRATION_ORDER.map((promptId) => PROMPT_REGISTRY[promptId]);
}

export function isRegisteredPromptId(value: string): value is PromptId {
  return PROMPT_MIGRATION_ORDER.includes(value as PromptId);
}

export function getFinalMigrationPromptId(): PromptId {
  return FINAL_AI_MIGRATION_PROMPT_ID;
}
