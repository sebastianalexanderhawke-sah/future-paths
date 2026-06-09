import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const contradictionDetectV1 = createPromptModule({
  promptId: "contradiction.detect",
  promptVersion: "1",
  taskInstructions:
    "Detect up to 3 identity tensions. Each needs contradiction_type, title, summary, pole_a, pole_b, themes, intensity, source_refs, and signature.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(context, "Produce JSON array of up to 3 contradiction drafts."),
});
