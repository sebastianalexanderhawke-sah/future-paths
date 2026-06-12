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

${FORECAST_GENERATE_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with active, hidden, and blind_spots arrays.

Each array contains future objects with title, why, and impact.

Use the situation, selected path (if present), and context answers to generate grounded, photographable futures.`,
    ),
});
