import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";
import {
  APPROVED_THEMES_PROMPT_TEXT,
} from "@/lib/ai/prompts/shared/theme-instructions";
import {
  TIMELINE_CHAPTER_REQUIRED_FIELDS,
  TIMELINE_STRICT_THEME_RULES,
} from "@/lib/ai/prompts/shared/timeline-instructions";

export const timelineGenerateV1 = createPromptModule({
  promptId: "timeline.generate",
  promptVersion: "1",
  taskInstructions: `Generate up to 8 life chapters from identity evidence. Chapter periods, date ranges, evidence groupings, and chronology are derived from supplied evidence seasons — do not invent historical periods outside evidence-derived chapter candidates. Narrative titles (not season names), tentative summaries, themes, and supporting evidence references. Include current self framing only on the most recent chapter.

${TIMELINE_CHAPTER_REQUIRED_FIELDS}

${TIMELINE_STRICT_THEME_RULES}`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Produce JSON array of up to 8 life chapter drafts with evidence links.

Each chapter must include every required field listed in the task instructions.

Each chapter.themes must contain 1-3 values chosen ONLY from this exact list:
${APPROVED_THEMES_PROMPT_TEXT}

Never invent theme labels. Map any concept to the closest approved theme before responding.`,
    ),
});
