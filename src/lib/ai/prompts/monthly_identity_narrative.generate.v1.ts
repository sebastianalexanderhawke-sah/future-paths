import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY,
  MONTHLY_IDENTITY_NARRATIVE_IDENTITY_CHANGES_RULES,
  MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS,
  MONTHLY_IDENTITY_NARRATIVE_SUMMARY_RULES,
  MONTHLY_IDENTITY_NARRATIVE_TITLE_RULES,
} from "@/lib/ai/prompts/shared/monthly-identity-narrative-instructions";

export const monthlyIdentityNarrativeGenerateV1 = createPromptModule({
  promptId: "monthly_identity_narrative.generate",
  promptVersion: "1",
  taskInstructions: `Turn each month in context.monthlyIdentityEvolution into one readable narrative chapter — this should feel like a monthly-resolution Life Chapter. Produce exactly one narrative per entry in context.monthlyIdentityEvolution, never more, never fewer, never inventing a month that isn't present.

${MONTHLY_IDENTITY_NARRATIVE_REQUIRED_FIELDS}

${MONTHLY_IDENTITY_NARRATIVE_TITLE_RULES}

${MONTHLY_IDENTITY_NARRATIVE_SUMMARY_RULES}

${MONTHLY_IDENTITY_NARRATIVE_IDENTITY_CHANGES_RULES}

${MONTHLY_IDENTITY_NARRATIVE_DATA_PRIORITY}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce a JSON array with exactly one narrative object per entry in context.monthlyIdentityEvolution, in the same order.

Each narrative.month MUST exactly match the corresponding context.monthlyIdentityEvolution[].month string.

Do not restate dominantThemes, majorDecisions, or futureShifts in your output — those are already final and supplied separately. Only produce month, title, summary, and identity_changes.`,
    ),
});
