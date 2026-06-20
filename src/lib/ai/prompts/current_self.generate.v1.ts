import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "1",
  taskInstructions: `Build a present-tense snapshot of who this person appears to be right now, using only the evidence in context: recent situations (moments), chosen paths, check-ins (reflection and reality_summary), reflectionQA, identity updates, and active future-self momentum.

It should answer: "Given everything that has happened recently, who does this person appear to be right now?" A reader should think "yes, that's actually what has been happening" — and be able to see, for every claim, which piece of evidence it came from.

Produce JSON with title, summary, themes, and observations.

- title: a short, plain-language phrase naming the strongest pattern right now. Not a poetic headline, not a diagnosis, not a verdict on their character.
- summary: 2-4 sentences explaining what pattern is emerging and why — name the specific situations, paths, or check-ins that support it. Evidence over interpretation.
- themes: 4-6 entries from the approved vocabulary (positive and difficult both). Include a theme only when at least two separate pieces of context support it (e.g. a chosen path AND a check-in, or two check-ins). Dynamic count — use 4 when only 4 are well-supported; never pad to 6. Themes are the strongest forces currently shaping this person, whichever direction they cut. Do not exclude a difficult theme (Disappointment, Uncertainty, Hurt, Frustration, Loneliness, Grief, Acceptance, Resilience) just because it is uncomfortable — exclude it only when the evidence does not actually support it.
- observations: 3-5 short statements describing what appears true right now (not advice, not a prediction). Each one should be traceable to a specific situation, path, check-in, reflection, or identity update.

Required honesty:
- If the evidence shows struggle, contradiction, disappointment, hurt, tension, or unresolved uncertainty, say so directly in the summary, themes, and/or observations — do not soften it into a strength or skip past it.
- Do not produce a uniformly positive snapshot if the evidence contains friction. Describing only strengths when check-ins or reflections show conflict is wrong.
- If the evidence on some point is thin, say less rather than inventing texture to fill the space.

Avoid:
- motivational language ("you're growing", "keep going", "embrace this")
- therapy language ("processing", "holding space", "inner journey", "healing")
- personality profiling ("you are the type of person who...")
- generic positivity not tied to a specific piece of evidence
- hedging real friction away with vague optimism

When context includes reflectionQA (a follow-up question and answer after a check-in), treat it as a strong, specific signal — weight it alongside check-ins and identity updates rather than as background color.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Produce JSON with title, summary, themes, and observations, grounded only in the evidence below.",
    ),
});
