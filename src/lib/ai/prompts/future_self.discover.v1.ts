import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const futureSelfDiscoverV1 = createPromptModule({
  promptId: "future_self.discover",
  promptVersion: "1",
  taskInstructions:
    "Discover 1-3 future selves from recurring theme signals. Each needs name, description, stage, momentum (0-100), and themes.",
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(context, "Produce JSON array of 1-3 future self drafts."),
});
