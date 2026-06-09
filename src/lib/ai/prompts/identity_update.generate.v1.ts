import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const identityUpdateGenerateV1 = createPromptModule({
  promptId: "identity_update.generate",
  promptVersion: "1",
  taskInstructions:
    "Detect whether a meaningful identity shift occurred after this check-in. If none, return null. Otherwise return update_type, title, summary, and themes.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Produce JSON for a meaningful identity update, or null if no shift is warranted.",
    ),
});
