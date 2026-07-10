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
  taskInstructions: `Generate a current understanding, three to five genuinely different directions the user's life could take from this moment, and the situation's opportunity/risk themes.

This output powers both the Decision Simulator and Future Forecast. Raw output must already be concrete, direction-oriented, and event-oriented. Post-processing will refine it — not rescue vague or reflective language.

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
      `Produce JSON with current_understanding, paths (3–5 items), opportunity_themes (1-3), and risk_themes (1-3).

Generate the 3 most meaningful genuinely different directions this person's life could take from here. Then, for a possible 4th and 5th path, add each ONLY if it represents another genuinely different direction — a different destination, not a different implementation. Stop as soon as the real directions are exhausted. If only three truly different directions exist, return three. Never generate filler.

Before responding, silently verify for every pair of paths: "If each became reality, would this person's life look meaningfully different one year from now?" If the answer is no for any pair, merge that pair and either find a genuinely different direction or return fewer paths. This verification is internal — never mention it in the output.

Each path needs title, description, direction, challenges_assumption, benefits (2-4), consequences (2-4), future_shift, and themes (1-3).

Each path.title must be a standalone 2-6 word direction label. Each path.description must explain that direction in one concrete sentence. Each path.direction must name where the road leads in 2-5 words. Exactly the paths that question an assumption in the user's framing (at least one) set challenges_assumption to one plain sentence naming that assumption; all others set it to "".

Each path must be a distinct direction with observable benefits, realistic consequences, and a behavioral future_shift. No two paths may differ only by tool, timing, scale, sequence, or degree.

Each path.themes, opportunity_themes, and risk_themes must contain only values chosen ONLY from this exact list:
${APPROVED_THEMES_PROMPT_TEXT}

Never invent theme labels. Map any concept to the closest approved theme before responding.`,
    ),
});
