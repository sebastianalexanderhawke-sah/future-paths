import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  APPROVED_THEMES_PROMPT_TEXT,
  STRICT_THEME_SELECTION_RULES,
} from "@/lib/ai/prompts/shared/theme-instructions";

export const crossroadGenerateV1 = createPromptModule({
  promptId: "crossroad.generate",
  promptVersion: "1",
  taskInstructions: `Generate a current understanding and exactly five distinct paths for the user's moment. Each path needs description, benefits (2-4), consequences (2-4), future_shift, and themes (1-3).

${STRICT_THEME_SELECTION_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with current_understanding and paths (length 5).

Each path.themes must contain 1-3 values chosen ONLY from this exact list:
${APPROVED_THEMES_PROMPT_TEXT}

Never invent theme labels. Map any concept to the closest approved theme before responding.`,
    ),
});
