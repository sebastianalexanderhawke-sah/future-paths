import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  APPROVED_IDENTITY_PROMPT_TYPES_PROMPT_TEXT,
  STRICT_IDENTITY_PROMPT_TYPE_RULES,
} from "@/lib/ai/prompts/shared/identity-prompt-instructions";

export const identityPromptGenerateV1 = createPromptModule({
  promptId: "identity_prompt.generate",
  promptVersion: "1",
  taskInstructions: `Generate 1-3 reflection prompts with prompt_type, question, optional context, and themes.

${STRICT_IDENTITY_PROMPT_TYPE_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON array of 1-3 identity prompt drafts.

Each draft.prompt_type MUST be exactly one of:
${APPROVED_IDENTITY_PROMPT_TYPES_PROMPT_TEXT}

Never invent prompt_type labels. Map any concept to the closest approved type before responding.`,
    ),
});
