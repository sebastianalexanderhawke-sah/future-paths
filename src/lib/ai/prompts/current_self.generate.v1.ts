import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "1",
  taskInstructions: `You are writing a Current Self portrait built from evidence — not an AI report.

This profile answers one question: What have we confidently learned about this person so far?

Future Paths is designed to become valuable within the first month of use. Do not assume years of evidence. Build the strongest, most coherent portrait that the current evidence genuinely supports — no more, no less. The portrait is expected to evolve as new evidence is collected.

It should NOT:
- Retell what happened
- Reference situations, jobs, relationships, moves, finances, or dates
- Sound like a therapist, an analyst, or a report
- Justify conclusions with evidence
- Hedge observations in the trait label itself ("tends to," "seems to," "often," "appears")
- Introduce characteristics that require more evidence than currently exists

It SHOULD:
- Describe enduring character — how this person thinks, decides, moves, handles pressure
- Sound like someone who knows this person well answering: "What is she like?"
- Make the person feel recognized
- Communicate which conclusions are deeply supported and which are still emerging — through evidence strength labels on observations, not hedging language
- Describe tradeoffs, not virtues. Every meaningful characteristic helps in some ways and costs something in others. Do not write a list of strengths. Do not write a list of flaws.

---

Before writing:
Infer the one to three deepest operating principles that best explain the accumulated evidence.

An operating principle is the underlying orientation that makes the person's behaviors make sense as a pattern. Not a description of behavior — the belief or value driving it.

Examples:
• Agency over passivity
• Stability over status
• Protecting independence
• Seeking depth over breadth
• Curiosity over certainty
• Meaning over comfort

These are internal reasoning only. Do not output them as labels. Do not name them in the portrait.

Use these principles to organize everything that follows:
- The summary flows from them. Each paragraph reinforces the same underlying orientation.
- The observations are derived from them — different expressions of the same person, not independently invented traits.
- Avoid introducing observations that do not connect back to the operating principles.

A reader finishing the portrait should think: "I understand what drives this person." Not: "I read four accurate observations."

Calibrate to the evidence available. If the evidence only clearly supports two operating principles, use two. Do not invent a third to fill space. A coherent portrait built from limited evidence is better than a sprawling one that overreaches.

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
- Both sides of a characteristic can appear naturally in the summary. When the evidence supports it, name what the tendency costs — not only what it enables.
- The summary should flow naturally from the operating principles you inferred. Each paragraph reinforces the same underlying orientation. Do not introduce ideas that don't connect back.

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
- Write all statements directly. Do not hedge.

---

observations (core traits):
Return EXACTLY 4 items. Not 3. Not 5. Exactly 4.

Format each item as two lines separated by a newline character (\\n):
Line 1: the trait — a 3–7 word phrase naming a stable characteristic
Line 2: evidence strength — exactly one of: Strong evidence | Moderate evidence | Emerging evidence

Evidence strength levels — choose based on breadth and consistency of supporting evidence in the context, not how confident you feel:

Strong evidence
The characteristic has appeared consistently across multiple sources and persisted over time. Examples: multiple situations with the same underlying pattern, multiple check-ins, confirmed reflections, repeated identity updates, or recurring monthly narratives.

Moderate evidence
The characteristic appears more than once but is not yet consistent enough across time or sources to be considered defining.

Emerging evidence
The characteristic has begun appearing recently or is supported by limited evidence. It may become stable over time, or may disappear as new evidence arrives.

Do not use: Weak, Confidence, Probability, Accuracy, or any hedging language in the trait label itself. The evidence strength line carries the calibration signal. Write all trait labels as direct statements.

Identity writing — what makes a good trait:
Every trait should answer: "What kind of person consistently makes these decisions?"
Prefer deeper characteristics: values, motivations, decision-making style, emotional tendencies, recurring tradeoffs, interpersonal patterns.
Avoid restating behavior. Infer the stable characteristic beneath the behavior.

Derive the four observations from the operating principles you identified — do not independently invent four traits. The observations should feel like different expressions of the same person, not four unrelated accurate facts.

Prefer depth over breadth. Every observation must trace back to evidence that actually exists. If the evidence strongly supports three characteristics, assign the fourth at Emerging evidence — but never introduce a characteristic the evidence does not support, even to fill a slot.

Every meaningful characteristic has both strengths and costs. Do not write a list of strengths. Do not write a list of flaws. Infer the full characteristic — not just what it enables. Avoid moral framing. Do not call traits positive or negative. Describe tendencies and their tradeoffs.

The trait label names the characteristic directly. The portrait holds both sides — not in every sentence, but wherever the evidence supports it.

Examples of characteristics with their full tradeoff:
• Values independence over consensus → may find it difficult to rely on others before exhausting personal options
• Trusts action over perfect conditions → may move before fully processing what is being left behind
• Resolves tension by moving forward rather than processing it → may find it easier to create distance than to repair it

Good traits:
• Trusts action more than perfect information
• Values independence over consensus
• Resolves tension by moving forward rather than processing it
• Protects the right to decide alone
• Absorbs difficulty without externalizing it

Bad traits:
• "Acts before certainty" — behavioral description, not the underlying characteristic
• "Financial stability is emerging..." — hedging belongs in the evidence strength line, not the trait
• "Tends to be quite reflective in difficult situations" — hedging in the label; also too long
• "Navigating uncertainty with resilience" — event-flavored, not timeless
• "Thinks independently under pressure" — behavioral, not deep enough

Format example — each observation is a single JSON string with \\n inside it:
"Trusts action more than perfect information\\nStrong evidence"
"Values independence over consensus\\nModerate evidence"
"Learning to name what is difficult\\nEmerging evidence"

Trait rules:
- 3–7 words on the trait line
- Timeless — would still be true in 2 years
- No event references. No explanation. No hedging in the trait label.
- Infer the stable characteristic beneath repeated behavior — do not describe the behavior itself

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
Name what the person's tendencies cost them, not only what they enable.
No motivational framing ("you're growing", "keep going").
No therapy language ("processing", "healing", "inner journey").
No generic statements not grounded in repeated patterns.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Write the Current Self portrait. Return JSON with: title (2–5 word character phrase), summary (exactly 2 paragraphs separated by a blank line, second person, pure character description — no concrete nouns from real life, no event references, no hedging), observations (exactly 4 items — each a JSON string containing the trait label and evidence strength separated by \\n, e.g. "Trusts action more than perfect information\\nStrong evidence"), recent_growth (exactly 3 short present-tense movement phrases), themes (4–6 theme names).`,
    ),
});
