import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "1",
  taskInstructions: `Synthesize a present-tense identity snapshot: headline, summary, and 1-3 themes from active signals.
When context includes reflectionQA (a follow-up question and answer after a check-in), treat it as a strong signal about what this experience revealed about the person — weight it alongside check-ins and identity updates.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(context, "Produce JSON with headline, summary, and themes."),
});
