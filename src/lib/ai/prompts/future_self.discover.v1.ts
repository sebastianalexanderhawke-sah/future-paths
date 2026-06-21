import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { STRICT_FUTURE_SELF_EVIDENCE_STRENGTH_RULES } from "@/lib/ai/prompts/shared/future-self-instructions";
import { FUTURE_SELF_FORECAST_RULES } from "@/lib/ai/prompts/shared/forecast-generation-instructions";

export const futureSelfDiscoverV1 = createPromptModule({
  promptId: "future_self.discover",
  promptVersion: "1",
  taskInstructions: `Discover 2-4 future selves from recurring theme signals across this person's chosen paths, check-ins, reflections, and identity updates.

This output answers: "Based on my recent actions and choices, what kinds of people am I becoming, and what are the benefits and costs of each path?"

${FUTURE_SELF_FORECAST_RULES}

Each draft needs name, summary, percentage (0-100), evidence_strength, benefits, consequences, prediction, and themes.

${STRICT_FUTURE_SELF_EVIDENCE_STRENGTH_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON array of 2-4 future self drafts.

The percentage field across all drafts in the array MUST sum to exactly 100.

Each draft.evidence_strength MUST be exactly one of the approved values below.

Never invent evidence_strength labels. Map any concept to the closest approved value before responding.`,
    ),
});
