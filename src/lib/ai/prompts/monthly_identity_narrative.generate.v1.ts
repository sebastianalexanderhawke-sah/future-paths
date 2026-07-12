import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY,
  MONTHLY_IDENTITY_NARRATIVE_HEADLINE_RULES,
  MONTHLY_IDENTITY_NARRATIVE_OPENING_RULES,
  MONTHLY_IDENTITY_NARRATIVE_PURPOSE,
  MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS,
  MONTHLY_IDENTITY_NARRATIVE_STYLE_RULES,
  MONTHLY_IDENTITY_NARRATIVE_TEASER_RULES,
} from "@/lib/ai/prompts/shared/monthly-identity-narrative-instructions";

export const monthlyIdentityNarrativeGenerateV1 = createPromptModule({
  promptId: "monthly_identity_narrative.generate",
  // v2: dedicated cover teaser + "Becoming" opening rules (direction of
  // change, open-ended shaping close, no future-self references).
  // v3: simpler identity portraits — one 2–4 sentence paragraph each, plain
  // reflective voice, hard ban on event nouns (jobs/moves/relationships);
  // experiences appear only as what they changed in the person.
  // v4: the still-running most recent month writes opening_end in present
  // tense (who they are becoming now), never as a sealed ending.
  promptVersion: "4",
  taskInstructions: `Turn each month in context.monthlyIdentityEvolution into one chapter about how this person changed that month. Produce exactly one narrative per entry in context.monthlyIdentityEvolution, never more, never fewer, never inventing a month that isn't present.

${MONTHLY_IDENTITY_NARRATIVE_PURPOSE}

${MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS}

${MONTHLY_IDENTITY_NARRATIVE_HEADLINE_RULES}

${MONTHLY_IDENTITY_NARRATIVE_TEASER_RULES}

${MONTHLY_IDENTITY_NARRATIVE_OPENING_RULES}

${MONTHLY_IDENTITY_NARRATIVE_STYLE_RULES}

${MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce a JSON array with exactly one narrative object per entry in context.monthlyIdentityEvolution, in the same order.

Each narrative.month MUST exactly match the corresponding context.monthlyIdentityEvolution[].month string.

Do not restate dominantThemes, majorDecisions, or futureShifts in your output, and do not produce a "How you changed" list — that's computed deterministically and rendered separately. Only produce month, headline, teaser, opening_beginning, and opening_end.`,
    ),
});
