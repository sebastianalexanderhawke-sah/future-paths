import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { STRICT_FUTURE_SELF_EVIDENCE_STRENGTH_RULES } from "@/lib/ai/prompts/shared/future-self-instructions";
import { FUTURE_SELF_FORECAST_RULES } from "@/lib/ai/prompts/shared/forecast-generation-instructions";

export const futureSelfDiscoverV1 = createPromptModule({
  promptId: "future_self.discover",
  promptVersion: "2",
  taskInstructions: `Discover 2-5 emerging identity trajectories from this person's situations, chosen paths, check-ins, reflections, and identity updates.

This output answers: "Based on what I keep choosing and doing, what kind of person am I becoming?"

${FUTURE_SELF_FORECAST_RULES}

Each draft needs: name, summary, movement_direction, evidence_strength, core_behaviors, behavioral_evidence, growth_opportunities, blind_spots, likely_evolution, themes, and why_emerging.

${STRICT_FUTURE_SELF_EVIDENCE_STRENGTH_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON array of 2-5 Future Self drafts.

Each draft.movement_direction MUST be exactly one of: positive, negative, unchanged.

Each draft.evidence_strength MUST be exactly one of the approved values below.

Never invent evidence_strength labels. Map any concept to the closest approved value before responding.${
        context.riskFocusThemes?.length
          ? `

riskFocusThemes is present: ${context.riskFocusThemes.join(", ")}. Negative evidence on these themes (risk themes from recent situations, repeated weakened check-ins) is now materially present — at least one of this run's drafts MUST have movement_direction "negative" and be built around one or more of these themes.
That draft's central thesis must BE the decline itself — drift, avoidance, stagnation, isolation, burnout, dependency, or abandoning a goal — not a positive identity that merely lists a risk among its blind_spots. It must describe a genuinely different identity the person could be becoming, not the same identity as a positive draft with a worse outcome attached.
Good: "Quietly Withdrawing", "Running on Urgency", "Deferring the Psychology Path", "Building a Life That Doesn't Fit".
Bad: "Self-Reliant Builder (but there are risks)".`
          : ""
      }`,
    ),
});
