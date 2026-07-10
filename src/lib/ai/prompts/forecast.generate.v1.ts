import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { FORECAST_GENERATE_RULES } from "@/lib/ai/prompts/shared/forecast-generate-instructions";

export const forecastGenerateV1 = createPromptModule({
  promptId: "forecast.generate",
  promptVersion: "1",
  taskInstructions: `Generate a Future Forecast: a believable timeline of what life could look like over the next year if the user genuinely commits to their chosen path.

This is a simulation task, not a prediction list. Continue the story of the chosen path through the moments this person would most likely live through — do not output path benefits, consequences, or coaching language.

Inputs available in context:
- moment.title: the situation
- moment.description: context answers and selected path summary when present
- selectedForecastPath: the chosen decision path (title, description, strategy details) when forecasting a selected path
- checkInSummaries: array of check-in reality summaries (chronological, oldest first) — present only when regenerating after check-ins

${FORECAST_GENERATE_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with current_understanding, likely_developments (exactly 3), failure_modes (exactly 3), and alternative_outcomes (exactly 2) — exactly 8 futures total.

current_understanding: 3-5 plain-language sentences summarizing what you understand about the situation from moment.title, moment.description, and the selected path (if present) — what's happening, who's involved, and what's actually at stake. This is shown to the user as "What Future Paths Understands," so it must read as a synthesis, not a restatement of raw question-and-answer pairs. Do not invent details beyond what was provided.

Each future object has title, why (one short paragraph on why this moment matters and what living it feels like), impact, signals (exactly 3), and timeframe. See the rules above for exactly what each field requires.

The eight moments together must read as one believable year of this path — the reader should finish feeling they already lived a small version of this future.`,
    ),
});
