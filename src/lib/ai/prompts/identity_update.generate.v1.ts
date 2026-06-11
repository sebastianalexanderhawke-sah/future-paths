import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  APPROVED_IDENTITY_UPDATE_TYPES_PROMPT_TEXT,
  STRICT_IDENTITY_UPDATE_TYPE_RULES,
} from "@/lib/ai/prompts/shared/identity-update-instructions";

export const identityUpdateGenerateV1 = createPromptModule({
  promptId: "identity_update.generate",
  promptVersion: "1",
  taskInstructions: `Detect whether a meaningful identity shift occurred after this check-in. If none, return null. Otherwise return update_type, title, summary, and themes using tentative language.

${STRICT_IDENTITY_UPDATE_TYPE_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON for a meaningful identity update, or null if no shift is warranted.

When returning an object, update_type MUST be exactly one of:
${APPROVED_IDENTITY_UPDATE_TYPES_PROMPT_TEXT}

Never invent update_type labels.`,
    ),
});
