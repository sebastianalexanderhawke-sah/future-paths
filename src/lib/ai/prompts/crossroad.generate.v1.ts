import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import { CROSSROAD_GENERATION_RULES } from "@/lib/ai/prompts/shared/crossroad-instructions";
import {
  APPROVED_THEMES_PROMPT_TEXT,
  STRICT_THEME_SELECTION_RULES,
} from "@/lib/ai/prompts/shared/theme-instructions";

export const crossroadGenerateV1 = createPromptModule({
  promptId: "crossroad.generate",
  promptVersion: "1",
  taskInstructions: `Generate a current understanding, five to seven distinct decision paths, and the situation's opportunity/risk themes for the user's moment.

This output powers both the Decision Simulator and Future Forecast. Raw output must already be concrete, strategic, and event-oriented. Post-processing will refine it — not rescue vague or reflective language.

${CROSSROAD_GENERATION_RULES}

${STRICT_THEME_SELECTION_RULES}

Situation polarity rules (opportunity_themes / risk_themes — strict):
- These describe the situation itself, not any single path: which approved themes does just being in this situation make more likely to grow, and which does it put at risk, regardless of which path the person eventually picks?
- opportunity_themes: 1-3 approved themes this situation could meaningfully strengthen.
- risk_themes: 1-3 approved themes this situation could meaningfully weaken.
- A theme may appear in both, only one, or neither list. Do not pad either list — only include themes genuinely implicated by this situation.
- Chosen ONLY from the same approved theme list as path themes.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON with current_understanding, paths (5–7 items), opportunity_themes (1-3), and risk_themes (1-3).

Generate five paths. Then evaluate whether the available evidence supports another genuinely distinct future not already represented. If so, generate a sixth path. Repeat this evaluation once more for a possible seventh path. Otherwise stop. Never exceed 7. Never generate an additional path unless the evidence justifies it.

Each path needs title, description, benefits (2-4), consequences (2-4), future_shift, and themes (1-3).

Each path.title must be a standalone 2-6 word strategy label. Each path.description must explain that strategy in one concrete sentence.

Each path must be a distinct strategy with observable benefits, realistic consequences, and a behavioral future_shift.

Each path.themes, opportunity_themes, and risk_themes must contain only values chosen ONLY from this exact list:
${APPROVED_THEMES_PROMPT_TEXT}

Never invent theme labels. Map any concept to the closest approved theme before responding.`,
    ),
});
