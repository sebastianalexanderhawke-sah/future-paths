import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const alternateSelfGenerateV1 = createPromptModule({
  promptId: "alternate_self.generate",
  promptVersion: "1",
  taskInstructions:
    "Generate an alternate self from a past crossroad and selected alternative path: name, road_not_taken, alternate_self, what_remains_available, themes.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(context, "Produce JSON for one alternate self draft."),
});
