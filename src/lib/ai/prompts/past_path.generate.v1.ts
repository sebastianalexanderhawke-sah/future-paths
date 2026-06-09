import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const pastPathGenerateV1 = createPromptModule({
  promptId: "past_path.generate",
  promptVersion: "1",
  taskInstructions:
    "Generate 3-5 plausible alternative paths the user could have taken at a past crossroad. No regret framing.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Produce JSON array of 3-5 past alternative path drafts.",
    ),
});
