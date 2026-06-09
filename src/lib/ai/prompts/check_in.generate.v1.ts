import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const checkInGenerateV1 = createPromptModule({
  promptId: "check_in.generate",
  promptVersion: "1",
  taskInstructions:
    "Summarize lived reality for this check-in. Return reality_summary, theme_changes (1-3), and identity_impact using tentative language.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Produce JSON with reality_summary, theme_changes, and identity_impact.",
    ),
});
