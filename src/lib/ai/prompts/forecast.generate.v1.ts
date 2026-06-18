import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { FORECAST_GENERATE_RULES } from "@/lib/ai/prompts/shared/forecast-generate-instructions";

export const forecastGenerateV1 = createPromptModule({
  promptId: "forecast.generate",
  promptVersion: "1",
  taskInstructions: `Generate a dedicated Future Forecast for the user's situation.

This is a first-class forecasting task. Output concrete future realities directly — do not output path benefits, consequences, or coaching language.

Inputs available in context:
- moment.title: the situation
- moment.description: context answers and selected path summary when present
- selectedForecastPath: the chosen decision path (title, description, strategy details) when forecasting a selected path
- checkInSummaries: array of check-in reality summaries (chronological, oldest first) — present only when regenerating after check-ins

${FORECAST_GENERATE_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with current_understanding, active, hidden, and blind_spots arrays.

current_understanding: 3-5 plain-language sentences summarizing what you understand about the situation from moment.title, moment.description, and the selected path (if present) — what's happening, who's involved, and what's actually at stake. This is shown to the user as "What Future Paths Understands," so it must read as a synthesis, not a restatement of raw question-and-answer pairs. Do not invent details beyond what was provided.

Each future array contains future objects with title, why, and impact.

Use the situation, selected path (if present), and context answers to generate grounded, photographable futures.`,
    ),
});
