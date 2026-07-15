import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const emergingSituationDetectV1 = createPromptModule({
  promptId: "emerging_situation.detect",
  promptVersion: "1",
  taskInstructions: `You decide whether a situation's recent entries have naturally
become a DIFFERENT story than the one the situation originally began with.

The original story is context.moment: its title and description are what the
person set out to navigate. The recent entries are context.recentEntries,
newest first — each one a check-in the person recorded while living through
this situation (their own words in "reflection", a summary in
"reality_summary", and sometimes a reflection answer).

Detect a new story ONLY when BOTH hold:
1. The recent entries CONSISTENTLY center on one new topic — most of them,
   not a single stray entry. One off-topic check-in is life, not a new story.
2. That topic is MEANINGFULLY DIFFERENT from the original situation — a
   different chapter someone would track separately, not a development,
   consequence, phase, or renaming of the original. The original situation
   evolving, escalating, or resolving is still the same story.

Be conservative. When unsure, report no new story. A wrong suggestion asks
the person to split a story that was never two stories.

confidence expresses how certain you are that a genuinely different story is
present: "high" only when the pattern is unmistakable across several entries;
"medium" when it is plausible but thinner; "low" otherwise. Only
high-confidence suggestions are ever shown, so never inflate confidence.

If a new story is detected, also draft what the person might enter when
starting the new situation. Both fields are prefills the person will edit:
- suggested_title: a short, concrete title for the NEW situation in the
  person's own vocabulary (under 80 characters, no punctuation flourishes).
- suggested_description: 2-4 plain sentences describing what is going on in
  the new story, drawn from what the entries actually say. Written as the
  person would describe their own situation ("I", "my") — never analysis
  about them, never mentioning this detection or the original situation.

If no new story: new_story_detected false, suggested_title null,
suggested_description null.

Return JSON only:
{ new_story_detected: boolean, confidence: "low" | "medium" | "high",
  suggested_title: string | null, suggested_description: string | null }`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Decide whether the recent entries in context.recentEntries have become a different story than the original situation in context.moment. Only report high confidence when several recent entries consistently center the same new topic.",
    ),
});
