import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  CHECK_IN_DIFFICULT_THEMES_PROMPT_TEXT,
  CHECK_IN_POSITIVE_THEMES_PROMPT_TEXT,
} from "@/lib/check-in-themes";
import {
  CHECK_IN_HONEST_THEME_RULES,
  STRICT_THEME_CHANGE_RULES,
} from "@/lib/ai/prompts/shared/theme-instructions";

export const checkInGenerateV1 = createPromptModule({
  promptId: "check_in.generate",
  promptVersion: "1",
  taskInstructions: `Summarize lived reality for this check-in. Return reality_summary, theme_changes (1-3), and identity_impact.

Reality summary rules (strict):
- Keep reality_summary short and direct — 2-3 short sentences total, never a multi-paragraph essay. The user already knows what happened; do not re-explain or elaborate on it.
- Format as: "Reality: <one short sentence stating what happened>. What changed: <one short sentence on what's different now>."
- State the bare fact plainly. Do not add interpretation, advice, or emotional commentary — theme_changes already carries the emotional read.
  Good: "Reality: She chose him. What changed: The uncertainty is gone — the outcome is now known."
  Bad: a multi-paragraph reflection exploring feelings, possible reasons, or what the user might do next.

${CHECK_IN_HONEST_THEME_RULES}

${STRICT_THEME_CHANGE_RULES}

identity_impact — Predict the answer the user will write when they are asked a reflection question about this check-in.

This field is NOT an identity analysis. It is NOT a private thought. It is Future Paths' prediction of the specific words the user will type.

How this works: after this check-in is saved, the user will be asked a question such as:
  "What surprised you most about what happened?"
  "What mattered most to you in this situation?"
  "What did this reveal about what you value?"
  "What outcome were you most worried about beforehand?"
  "What would you do differently in a similar situation?"

Read context.reflection. Based on what this person wrote, predict the answer they would most naturally type to whichever of those questions their check-in most strongly implies. Write it in their voice.

context.chosenPath.future_shift is background context only. Do not echo its wording.

Voice: first person, every word. A direct answer to a specific question.
Length: 10–25 words. Shorter is better. Hard ceiling: 35 words.
Tone: honest, slightly unfinished, emotionally believable. The user should want to edit it, not delete it.

Banned — any of these disqualifies the output:
  "This check-in" / "This experience" / "This reveals" / "This suggests" / "This shows"
  "The theme" / "One pattern" / "It seems" / "It appears" / "You may" / "You might"
  suggests / reveals / appears / implies / indicates / demonstrates
  "I realize that this situation" / "I think this means" / "This tells me that"
  identity / themes / patterns / evidence / growth / future selves
  they / you / the user / she / he / a sense of / a version of

Bad — these fail because they analyze instead of answering:
  "This check-in may suggest a shift in how you relate to commitment."
  "The theme of Resilience appears especially present in what you shared."
  "You may become someone who no longer waits for permission."
  "It seems you are beginning to develop a more settled sense of what matters."
  "I realize that this situation shows me I care deeply about being understood."
  "I think this means I need to reconsider my relationship with risk."

Good — each is a direct answer to its implied question:
  Q implied: "What made this feel like the right time?"
  A: "I think I finally got tired of waiting for things to become what I wanted them to be."

  Q implied: "What mattered most about how you handled this?"
  A: "I wanted to prove to myself that I could stop waiting and actually do something."

  Q implied: "What did staying through this reveal about what you value?"
  A: "I care more about feeling certain than I realized."

  Q implied: "What surprised you most about how this turned out?"
  A: "I expected to feel relieved, but mostly I just felt tired of the whole thing."

  Q implied: "What would you do differently if this happened again?"
  A: "I'd say something sooner instead of waiting for it to fix itself."`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with reality_summary, theme_changes, and identity_impact.

Each theme_changes item MUST be an object with both fields:
Positive themes → { "theme": "<positive theme>", "direction": "strengthened" | "emerging" | "weakened" }
Difficult themes → { "theme": "<difficult theme>", "direction": "present" | "processing" | "fading" }

Positive themes:
${CHECK_IN_POSITIVE_THEMES_PROMPT_TEXT}

Difficult themes:
${CHECK_IN_DIFFICULT_THEMES_PROMPT_TEXT}

Never omit direction. Never output theme-only strings.

identity_impact: predict the answer the user will write to their reflection question. First person, 10–25 words, hard max 35. A direct answer — honest, slightly unfinished, specific to what they wrote. No analyst framing, no "This check-in", no "This suggests", no "The theme". Read the good and bad examples above — match the good ones exactly.`,
    ),
});
