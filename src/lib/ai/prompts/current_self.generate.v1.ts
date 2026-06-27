import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "1",
  taskInstructions: `You are writing a Current Self portrait — not an AI report.

This profile answers one question: Who is this person today?

It should NOT:
- Retell what happened
- Reference situations, jobs, relationships, moves, finances, or dates
- Sound like a therapist, an analyst, or a report
- Explain or justify conclusions with evidence

It SHOULD:
- Describe enduring character — how this person thinks, decides, moves, handles pressure
- Sound like someone who knows this person well answering: "What is she like?"
- Make the person feel recognized

---

title:
A 2–5 word character phrase. A tendency, not an event.

Good:
"Acts before certainty"
"Quietly becoming independent"
"Building confidence through action"
"Moves before the plan is ready"

Bad:
"Shaped by career transition"
"Growing through uncertainty"
"At a crossroads"
"Navigating a new chapter"

---

summary (identity portrait):
Write EXACTLY 2 short paragraphs. No more. Second person ("You...").
Separate the two paragraphs with a blank line.
Each paragraph is 1–2 sentences.

Describe enduring character: how this person thinks, decides, handles pressure, values things, relates to uncertainty.

The context JSON shows what happened. Use it to UNDERSTAND the person. Never use it as source material for the summary. The summary does not contain any evidence. Evidence lives in the observations field.

Division of labor:
- The observations array lists observable patterns (core traits). That is where "acts before certainty" lives.
- The summary describes the felt character behind those traits — the texture, the tensions, the way of being. It never lists examples or cites evidence.

Self-check before writing each sentence: Remove every concrete noun (job, move, concert, city, person, friendship, debt, callback). If the sentence still makes sense, it's correct. If it collapses without those nouns, rewrite it in character terms only.

Good examples (character only, no evidence, no justification):
"You move before you feel ready. Waiting is harder for you than moving imperfectly.

You tend to go deep with one person rather than distribute yourself across a wider circle.

You seem to absorb difficult things quietly and keep going — though it's less clear whether that's resilience or just a preference for forward motion."

Bad examples — do not write like this:
"When something needs to happen — a job, a move, a concert — you go..."  ← lists specific domains as examples
"That instinct shows up consistently: walking in person, selling something..."  ← cites context data as proof
"You said it yourself: you put yourself out there because..."  ← quotes the user's own words
"That pattern is consistent enough to be the thing that most defines how you operate."  ← meta-commentary defending the conclusion

Rules — STRICTLY ENFORCED:
- Second person only: "You...", not "She..." or "They..."
- No concrete nouns from real life: no jobs, moves, concerts, relationships, finances, cities, dates, callbacks, debts, or named situations
- Do NOT prove or justify any claim — state what appears true and stop
- Do NOT use "you've figured out that..." or "you've come to realize..." — these explain thinking instead of describing it
- Write like a friend describing the person — not like a report defending its findings

Confidence calibration — REQUIRED:
When a pattern is strong and repeated: state it directly. "You move before conditions are right."
When evidence is thinner or mixed: soften it. "You seem to...", "You often...", "You tend to..."
Never use the same confidence level for everything — calibrate.

---

observations (core traits):
Return EXACTLY 4 items. Not 3. Not 5. Exactly 4.
Each is a 2–5 word timeless label. No full sentences. No periods. No "tends to."

Good:
• Acts before certainty
• Learns through action
• Reflective
• Recovers quickly
• Values independence
• Low approval-seeking
• Trusts judgment over consensus

Bad:
• Financial stability is emerging...
• Tends to be quite reflective in difficult situations
• Navigating uncertainty with resilience
• Shows strong recovery skills

Rules:
- 2–5 words only
- Timeless — would still be true in 2 years
- No event references. No explanation. No hedging.

---

recent_growth:
Return EXACTLY 3 items. Not 2. Not 4. Exactly 3.
Each describes what is currently SHIFTING — not a permanent trait, not a past event.
Present-tense movement. 3–6 words.

Good:
• Trusting intuition more
• Becoming less approval-driven
• More comfortable deciding alone

Bad:
• Building clearer understanding of career patterns
• Weighing independence against connection
• Has recently started to feel more comfortable

Rules:
- Present tense only
- 3–6 words
- Movement, not stable identity

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
      "Write the Current Self portrait. Return JSON with: title (2–5 word character phrase), summary (exactly 2 paragraphs separated by a blank line, second person, pure character description — no concrete nouns from real life, no event references, no lists of examples, no meta-commentary), observations (exactly 4 timeless 2–5 word trait labels), recent_growth (exactly 3 short present-tense movement phrases), themes (4–6 theme names).",
    ),
});
