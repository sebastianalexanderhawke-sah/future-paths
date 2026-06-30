import { SIGNAL_DEFINITIONS, SIGNAL_SLUGS } from "@/lib/behavior-signals";
import { buildTaskSystemPrompt } from "@/lib/ai/prompts/shared/system-base";

const SIGNAL_VOCABULARY_LINES = SIGNAL_SLUGS.map(
  (slug) => `  ${slug}: ${SIGNAL_DEFINITIONS[slug].description}`,
).join("\n");

const TASK_INSTRUCTIONS = `Extract atomic behavioral observations from a completed situation.

Each observation must describe one concrete action or decision the person actually made — not what they thought, felt, intended, or achieved. Observations must be:
- Atomic: one action or decision per observation
- Observable: concrete enough that another person could have seen it happen
- Specific: tied to this specific situation, not a general trait
- Reusable: written so it could be read months later without losing its meaning

Do NOT generate observations that:
- Name a personality trait ("is independent", "tends to avoid...")
- Make a prediction or judgment ("will likely...", "this shows...")
- Describe an emotion alone without a behavior ("felt anxious about the choice")
- Duplicate another observation in different words

For each observation, optionally tag it with 0-2 signal slugs from the approved vocabulary. Use a signal only when it clearly describes what the observation shows — leave signals empty when none fit precisely.

Approved signal vocabulary:
${SIGNAL_VOCABULARY_LINES}

Return JSON only:
{
  "observations": [
    { "observation": "...", "signals": ["signal_slug"] }
  ]
}

If the situation does not contain enough detail to extract observations, return: { "observations": [] }`;

export type SituationInput = {
  situationTitle: string;
  situationDescription?: string;
  chosenPathDescription?: string;
  checkInReflection?: string;
  identityImpact?: string;
};

export const behaviorExtractV1 = {
  promptId: "behavior_extract" as const,
  promptVersion: "1" as const,
  buildSystemPrompt(): string {
    return buildTaskSystemPrompt(TASK_INSTRUCTIONS);
  },
  buildUserPrompt(input: SituationInput): string {
    const lines: string[] = [`Situation: ${input.situationTitle}`];

    if (input.situationDescription) {
      lines.push(`Description: ${input.situationDescription}`);
    }

    if (input.chosenPathDescription) {
      lines.push(`\nChosen path: ${input.chosenPathDescription}`);
    }

    if (input.checkInReflection) {
      lines.push(`\nCheck-in reflection: ${input.checkInReflection}`);
    }

    if (input.identityImpact) {
      lines.push(`Identity impact noted: ${input.identityImpact}`);
    }

    lines.push("\nExtract behavioral observations from this situation.");

    return lines.join("\n");
  },
};
