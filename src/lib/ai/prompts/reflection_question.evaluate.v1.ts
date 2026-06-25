import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const reflectionQuestionEvaluateV1 = createPromptModule({
  promptId: "reflection_question.evaluate",
  promptVersion: "1",
  taskInstructions: `You decide whether a check-in warrants a reflection question.
A reflection question is worth asking when the check-in describes:
a meaningful outcome (positive or negative), an unexpected result,
an emotional experience, a decision made, or a significant change.
It is NOT worth asking when the check-in describes:
nothing changing, routine updates, vague non-events ('still waiting', 'nothing happened').

If worth asking: return should_reflect: true and a single
reflection question (max 15 words) that helps understand what
this experience meant to the person — not what happened, but
what it revealed about them. Draw from these types:
- 'What surprised you most about what happened?'
- 'What outcome were you most worried about beforehand?'
- 'What mattered most to you in this situation?'
- 'What did this reveal about what you value?'
- 'What would you do differently in a similar situation?'

Make the question specific to the check-in content — not generic.

If not worth asking: return should_reflect: false, question: null.

The check-in reflection text is in context.reflection.
The AI-generated reality summary is in context.realitySummary.

Return JSON only: { should_reflect: boolean, question: string | null }`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Evaluate whether a reflection question is warranted for this check-in. The reflection is in context.reflection and the reality summary is in context.realitySummary.",
    ),
});
