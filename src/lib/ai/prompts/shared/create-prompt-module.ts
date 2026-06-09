import type { IdentityContextBundle } from "@/lib/ai/context/slices";
import { serializeContext } from "@/lib/ai/context/truncate";
import { buildTaskSystemPrompt } from "@/lib/ai/prompts/shared/system-base";

export type PromptModule = {
  promptId: string;
  promptVersion: string;
  taskInstructions: string;
  buildUserPrompt: (context: IdentityContextBundle) => string;
};

export function createPromptModule(config: PromptModule): PromptModule {
  return config;
}

export function buildSystemPromptForModule(module: PromptModule): string {
  return buildTaskSystemPrompt(module.taskInstructions);
}

export function buildDefaultUserPrompt(
  context: IdentityContextBundle,
  instructions: string,
): string {
  return `${instructions}\n\nContext JSON:\n${serializeContext(context)}`;
}
