import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  APPROVED_THEMES_PROMPT_TEXT,
  STRICT_THEME_CHANGE_RULES,
  STRICT_THEME_SELECTION_RULES,
} from "@/lib/ai/prompts/shared/theme-instructions";

export const checkInGenerateV1 = createPromptModule({
  promptId: "check_in.generate",
  promptVersion: "1",
  taskInstructions: `Summarize lived reality for this check-in. Return reality_summary, theme_changes (1-3), and identity_impact using tentative language.

${STRICT_THEME_CHANGE_RULES}

${STRICT_THEME_SELECTION_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with reality_summary, theme_changes, and identity_impact.

Each theme_changes item MUST be an object with both fields:
{ "theme": "<approved theme>", "direction": "strengthened" | "emerging" | "weakened" }

Approved themes:
${APPROVED_THEMES_PROMPT_TEXT}

Never omit direction. Never output theme-only strings.`,
    ),
});
