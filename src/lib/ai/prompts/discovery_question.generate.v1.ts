import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { DISCOVERY_QUESTION_GENERATION_RULES } from "@/lib/ai/prompts/shared/discovery-question-instructions";

export const discoveryQuestionGenerateV1 = createPromptModule({
  promptId: "discovery_question.generate",
  promptVersion: "1",
  taskInstructions: `Generate follow-up discovery questions for the situation entry flow.

These questions are asked after the user enters their situation and selects a goal ("decision" or "forecast"), before path or forecast generation. The answers will be appended to the situation context.

Inputs available in context:
- moment.title: the user's situation text
- discoveryGoal: whether the user chose "decision" (explore paths) or "forecast" (what might happen next)

Tailor questions to the selected goal when it changes what information matters most.

${DISCOVERY_QUESTION_GENERATION_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with a \`questions\` array (4-5 items). Each item needs \`question\`, \`category\` (one of: Relationships, Career, Business, Relocation, Education, Health, Finance, Family, Custom), and \`reason\`.

Use moment.title as the situation text and discoveryGoal to align questions with the user's chosen flow.`,
    ),
});
