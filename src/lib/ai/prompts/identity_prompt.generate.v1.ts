import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const identityPromptGenerateV1 = createPromptModule({
  promptId: "identity_prompt.generate",
  promptVersion: "1",
  taskInstructions:
    "Generate 1-3 reflection prompts with prompt_type, question, optional context, and themes.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(context, "Produce JSON array of 1-3 identity prompt drafts."),
});
