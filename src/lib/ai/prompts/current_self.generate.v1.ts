import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "1",
  taskInstructions: `Write a Current Self profile with four fields: title, summary, observations, and recent_growth.

This is a character profile — not a summary of events.
Write as if you know this person well: not as an analyst, not as a therapist, but as a close friend who sees their patterns clearly.
The reader should think: "Yeah, that's me." Not: "I see why the AI concluded that."

---

title:
A short phrase capturing the most visible, enduring pattern.
Not an event. Not a time period. A character tendency.
Examples: "Acts before certainty arrives" · "Builds by doing, not planning" · "Protects a small circle first"

---

summary (identity paragraph):
1–3 sentences. Maximum 60 words.
Describe who this person IS — their character, their tendencies, their tensions.
Write it the way you would describe a close friend: "She's the kind of person who..."

Rules — STRICTLY ENFORCED:
- Do NOT start the paragraph with: "Across", "After", "Because", "Since", "Following", "Recently", "This month", "Based on"
- Do NOT mention any specific situation, circumstance, or life domain (no jobs, no relationships, no graduation, no finances, no cities, no dates)
- DO describe: how they make decisions, what they value, what tensions they carry, how they handle pressure

---

observations (core traits):
Return EXACTLY 4 items. Not 3. Not 5. Exactly 4.
Each is one short sentence describing a stable, enduring trait — something that would still be true in two months.

Style:
• Acts before certainty.
• Learns by doing, not planning.
• Trusts personal judgment over external consensus.
• Protects a small number of close relationships.

Rules:
- Short and direct. No explanation. No "tends to". No "may".
- No event references. No situation names. No time references.
- State the trait. Do not explain why.

---

recent_growth:
Return EXACTLY 3 items. Not 2. Not 4. Exactly 3.
Each describes what is currently SHIFTING — not a permanent trait, not a past event.
Present-tense movement.

Style:
• Becoming more comfortable making decisions alone.
• Trusting intuition more than plans.
• Letting go of needing perfect conditions first.

Rules:
- Present tense only. No event references. No situation names.

---

themes:
4–6 entries from the approved vocabulary.
Include difficult themes (Disappointment, Uncertainty, Hurt, Frustration, Loneliness, Grief, Acceptance, Resilience) when the patterns genuinely support them.

---

Honesty rules:
Name friction, contradiction, and unresolved tension directly. Do not soften.
No motivational framing ("you're growing", "keep going").
No therapy language ("processing", "healing", "inner journey").
No generic statements not grounded in repeated patterns.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Write the Current Self profile. Return JSON with: title, summary (identity paragraph, max 3 sentences), observations (exactly 4 core traits), recent_growth (exactly 3 movement bullets), themes (4–6 theme names).",
    ),
});
