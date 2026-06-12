import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { CROSSROAD_GENERATION_RULES } from "@/lib/ai/prompts/shared/crossroad-instructions";
import {
  APPROVED_THEMES_PROMPT_TEXT,
  STRICT_THEME_SELECTION_RULES,
} from "@/lib/ai/prompts/shared/theme-instructions";

export const crossroadGenerateV1 = createPromptModule({
  promptId: "crossroad.generate",
  promptVersion: "1",
  taskInstructions: `Generate a current understanding and exactly five distinct decision paths for the user's moment.

This output powers both the Decision Simulator and Future Forecast. Raw output must already be concrete, strategic, and event-oriented. Post-processing will refine it — not rescue vague or reflective language.

${CROSSROAD_GENERATION_RULES}

${STRICT_THEME_SELECTION_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with current_understanding and paths (length 5).

Each path needs description, benefits (2-4), consequences (2-4), future_shift, and themes (1-3).

Each path must be a distinct strategy with observable benefits, realistic consequences, and a behavioral future_shift.

Each path.themes must contain 1-3 values chosen ONLY from this exact list:
${APPROVED_THEMES_PROMPT_TEXT}

Never invent theme labels. Map any concept to the closest approved theme before responding.`,
    ),
});
