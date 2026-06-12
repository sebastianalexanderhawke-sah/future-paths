import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  APPROVED_FUTURE_SELF_STAGES_PROMPT_TEXT,
  STRICT_FUTURE_SELF_STAGE_RULES,
} from "@/lib/ai/prompts/shared/future-self-instructions";
import { FUTURE_SELF_FORECAST_RULES } from "@/lib/ai/prompts/shared/forecast-generation-instructions";

export const futureSelfDiscoverV1 = createPromptModule({
  promptId: "future_self.discover",
  promptVersion: "1",
  taskInstructions: `Discover 1-3 future selves from recurring theme signals.

This output powers Future Forecast blind spots. Raw output must describe concrete life trajectories and events — not reflection, coaching, or inner-work language.

${FUTURE_SELF_FORECAST_RULES}

Each draft needs name, description, stage, momentum (0-100), and themes.

${STRICT_FUTURE_SELF_STAGE_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON array of 1-3 future self drafts.

Each draft must describe observable life events and relationship changes — not self-awareness or emotional processing.

Each draft.stage MUST be exactly one of:
${APPROVED_FUTURE_SELF_STAGES_PROMPT_TEXT}

Never invent stage labels. Map any concept to the closest approved stage before responding.`,
    ),
});
