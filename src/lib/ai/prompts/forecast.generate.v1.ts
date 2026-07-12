import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { FORECAST_GENERATE_RULES } from "@/lib/ai/prompts/shared/forecast-generate-instructions";

export const forecastGenerateV1 = createPromptModule({
  promptId: "forecast.generate",
  promptVersion: "4",
  taskInstructions: `Generate a Future Forecast: a practical risk assessment of the user's chosen path — the realistic future events most likely to happen next, why each is plausible, and what the user can do today about each one.

This is a preparation task, not a prediction list and not coaching. Every card must forecast an observable real-world event — never an emotional state — that the user can watch for and act on. Do not output path benefits, consequences, or coaching language.

Inputs available in context:
- moment.title: the situation
- moment.description: context answers and selected path summary when present
- selectedForecastPath: the chosen decision path (title, description, strategy details) when forecasting a selected path
- checkInSummaries: array of check-in reality summaries (chronological, oldest first) — present only when regenerating after check-ins

${FORECAST_GENERATE_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with current_understanding, risks (5 or 6 cards), and opportunities (1 or 2 cards) — 6 to 8 forecast cards total.

current_understanding: 3-5 plain-language sentences summarizing what you understand about the situation from moment.title, moment.description, and the selected path (if present) — what's happening, who's involved, and what's actually at stake. This is shown to the user as "What Future Paths Understands," so it must read as a synthesis, not a restatement of raw question-and-answer pairs. Do not invent details beyond what was provided.

Each card object has title, what_could_happen (exactly 2 bullets), why_this (exactly 2 bullets — internal grounding, not shown to the user), what_you_can_do (exactly 2 bullets), confidence (integer 0-100), and timeframe. Bullets are short strings in an array — concise phrases, never paragraphs. Titles and what_could_happen describe observable events, never feelings. The user sees only the title, timeframe, what_could_happen, and what_you_can_do — those four must stand entirely on their own. See the rules above for exactly what each field requires.

Together the cards must read as an honest risk map of this specific path — the reader should finish knowing what is most likely to happen next, why, and what to do today about each card.`,
    ),
});
