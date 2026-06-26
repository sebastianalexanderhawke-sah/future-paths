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

identity_impact — CRITICAL EXCEPTION: the system-level tentative-language rule ("may", "might", "could") does NOT apply to this field. Ignore it here entirely.

Rules:
- First person only. Every sentence starts with "I" or flows naturally from it. Never "they", "them", "you", "she", "he", "the user", "a sense of", "a version of".
- One realization the event made clear. Not a summary. Not an observation about the user. The thing they now know.
- 1–2 sentences, 25–45 words. Hard maximum: 50 words. If you exceed 50 words, you wrote too much — cut.
- Forbidden: may, might, could, perhaps, seems, appears, suggests, beginning to, starting to, potentially, possibly, trajectory, orientation, professional identity, self-image.
- Write statements, not hedges. The event happened. The realization is real. State it.

Bad (hedged — exactly what not to write):
  "Landing this role may have shifted something — a sense of professional identity could be beginning to take shape."
  "This turn of events may have revealed a capacity for patience — the friendship that grew might reflect something about connection."
  "Taking these steps may have solidified a self-image as someone who follows through."

Good:
  "I didn't realize how much I wanted this until I had it — getting this role showed me I've been pointed here longer than I knew."
  "Giving him space wasn't a sacrifice — it's how I show up for people I actually care about."
  "I sold something I owned to make this trip happen, which tells me I find ways through rather than around."`,
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

identity_impact: first person "I", 1–2 sentences, 25–45 words (hard max 50). One realization stated as fact. No hedging, no "may/might/could". Read the bad examples above — do not write anything like them.`,
    ),
});
