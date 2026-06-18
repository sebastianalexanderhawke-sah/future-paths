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
  taskInstructions: `Summarize lived reality for this check-in. Return reality_summary, theme_changes (1-3), and identity_impact using tentative language.

Reality summary rules (strict):
- Keep reality_summary short and direct — 2-3 short sentences total, never a multi-paragraph essay. The user already knows what happened; do not re-explain or elaborate on it.
- Format as: "Reality: <one short sentence stating what happened>. What changed: <one short sentence on what's different now>."
- State the bare fact plainly. Do not add interpretation, advice, or emotional commentary — theme_changes already carries the emotional read.
  Good: "Reality: She chose him. What changed: The uncertainty is gone — the outcome is now known."
  Bad: a multi-paragraph reflection exploring feelings, possible reasons, or what the user might do next.

${CHECK_IN_HONEST_THEME_RULES}

${STRICT_THEME_CHANGE_RULES}`,
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

Never omit direction. Never output theme-only strings.`,
    ),
});
