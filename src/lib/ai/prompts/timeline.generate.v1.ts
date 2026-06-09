import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const timelineGenerateV1 = createPromptModule({
  promptId: "timeline.generate",
  promptVersion: "1",
  taskInstructions:
    "Generate up to 8 life chapters from identity evidence. Narrative titles (not season names), tentative summaries, themes, and supporting evidence references. Include current self framing only on the most recent chapter.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Produce JSON array of up to 8 life chapter drafts with evidence links.",
    ),
});
