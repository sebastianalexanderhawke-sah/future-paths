import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const crossroadGenerateV1 = createPromptModule({
  promptId: "crossroad.generate",
  promptVersion: "1",
  taskInstructions:
    "Generate a current understanding and exactly five distinct paths for the user's moment. Each path needs benefits, consequences, future_shift, and 1-3 themes from the allowed vocabulary.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Produce JSON with current_understanding and paths (length 5).",
    ),
});
