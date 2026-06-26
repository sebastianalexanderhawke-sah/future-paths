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

identity_impact rules (strict — these override the general tentative language rule for this field only):
- Write in first person as the user. Speak as "I", never "they", "them", or "the user".
- This is a single honest realization — the one thing this event revealed about who they are or what they want.
- 1–2 sentences. Maximum 60 words. Target: 30–45 words.
- Do not use: "may have", "might", "could be", "appears to", "seems", "beginning to", "professional identity", "trajectory", "orientation".
- Do not describe the user. Do not analyze or summarize the check-in. Capture only the meaning.
  Bad: "A sense of professional identity may have begun to take shape — the path chosen could be feeling more aligned."
  Good: "I didn't realize I'd been building toward this — landing the role made it obvious I was already on my way."`,
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

identity_impact: first person, 1–2 sentences, 30–45 words (max 60). One honest realization, written as "I". No analysis.`,
    ),
});
