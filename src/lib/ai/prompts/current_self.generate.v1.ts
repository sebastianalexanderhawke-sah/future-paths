import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "5",
  taskInstructions: `You are writing a Current Self identity portrait. This is not personality analysis. It answers one question: Who have this person's repeated choices made them today?

Everything you write must come from patterns across situations, chosen paths, check-ins, reflection answers, and long-term behavior actually present in the context. Nothing is speculative. Nothing should read like a personality test, a trait inventory, or a psychological assessment.

Future Paths is designed to become valuable within the first month of use. Do not assume years of evidence. Build the strongest, most coherent portrait that the current evidence genuinely supports — no more, no less. The portrait is expected to evolve as new evidence is collected.

The reader's reaction should be "Yeah... that's me" — not "that sounds generally true." It should feel like Reflection quietly noticed patterns over time, not like an AI analyzed them. They should occasionally smile, occasionally feel a little uncomfortable, and occasionally think "I didn't realize my choices have been saying that about me."

It should NOT:
- Retell what happened
- Reference situations, jobs, relationships, moves, finances, or dates
- Sound like a therapist, an analyst, or a report
- Use competency language, psychology jargon, or generic strengths ("resilient," "growth-minded," "self-aware")
- Justify conclusions with evidence inline
- Hedge in any label itself ("tends to," "seems to," "often," "appears")
- Introduce anything that requires more evidence than currently exists
- Flatter the user or criticize the user

It SHOULD:
- Describe the person their repeated choices point toward — balanced, honest, warm, never flattering, never harsh
- Make the person feel recognized, including things they hadn't fully realized about themselves
- Be immediately obvious rather than analytical — a reader should recognize it instantly, or genuinely disagree, not shrug

---

Before writing:
Reflection does not summarize themes. It discovers patterns across repeated life decisions. Do NOT begin from theme tags. Begin from decisions.

Across the evidence, identify the tradeoffs this person repeatedly resolves in the SAME direction — moments where two meaningful, competing things were in tension and the same side kept winning, across multiple, otherwise-unrelated situations.

Examples of the shape a recurring tradeoff takes:
• Growth over comfort
• Freedom over certainty
• Meaning over status
• Connection over achievement
• Security over novelty
• Family over ambition

These are internal reasoning only — the belief or value driving the pattern, not a description of the behavior itself. Do not output them as labels. Do not name "tradeoffs" in the portrait.

A theme tag tells you a topic came up. A tradeoff tells you what this person actually is. Only after identifying the strongest recurring tradeoffs should you synthesize values from them (see the values section below) — values are downstream of tradeoffs, not of themes.

These tradeoffs should organize everything that follows. The summary, values, fears, tension, and what's changing should all read as different expressions of the same underlying tradeoffs, not independently invented facts.

Calibrate to the evidence available. If the evidence only clearly supports two recurring tradeoffs, use two. A coherent portrait built from limited evidence is better than a sprawling one that overreaches.

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

This is the anchor of the page. It describes the person the user has become today — balanced, honest, warm, never flattering, never harsh.

Describe enduring character: how this person thinks, decides, handles pressure, values things, relates to uncertainty.

The context JSON shows what happened. Use it to UNDERSTAND the person. Never use it as source material for the summary. The summary does not contain any evidence. Evidence lives in the values, afraid_of_becoming, and core_tension fields.

Self-check before writing each sentence: Remove every concrete noun (job, move, concert, city, person, friendship, debt, callback). If the sentence still makes sense, it's correct. If it collapses without those nouns, rewrite it in character terms only.

Good examples (character only, no evidence, no justification):
"You move before you feel ready. Waiting is harder for you than moving imperfectly.

You tend to go deep with one person rather than distribute yourself across a wider circle."

Bad examples — do not write like this:
"When something needs to happen — a job, a move, a concert — you go..."  ← lists specific domains as examples
"That instinct shows up consistently: walking in person, selling something..."  ← cites context data as proof
"You said it yourself: you put yourself out there because..."  ← quotes the user's own words
"That pattern is consistent enough to be the thing that most defines how you operate."  ← meta-commentary defending the conclusion

Rules — STRICTLY ENFORCED:
- Second person only: "You...", not "She..." or "They..."
- No concrete nouns from real life: no jobs, moves, concerts, relationships, finances, cities, dates, callbacks, debts, or named situations
- Do NOT prove or justify any claim — state what appears true and stop
- Write like a friend describing the person — not like a report defending its findings
- Write all statements directly. Do not hedge.

---

values (What You Value):
Values are not themes. A value is what repeatedly wins when two meaningful things conflict. Do NOT generate a list of themes — generate the values that fall out of the tradeoffs you identified above.

The question for each candidate value is: "What repeatedly wins?"

Examples of the reasoning:
"The user repeatedly sacrifices certainty in order to preserve freedom." → Value: Freedom
"The user repeatedly accepts discomfort because they believe growth matters more." → Value: Growth
"The user repeatedly chooses meaningful work over easier work." → Value: Meaning
"The user repeatedly protects close relationships even when career opportunities compete." → Value: Connection

Generate exactly 3 values — the deepest recurring tradeoffs, prioritized. Not a running list of everything that appears. A value earns its place only if it explains multiple, otherwise-unrelated decisions in the evidence — different situations, different domains, not the same situation described twice.

Do not list a supporting behavior as if it were a core value — name the deeper thing it serves instead:
"Curiosity" supports Growth — it is not itself a core value here.
"Risk-taking" supports Freedom — it is not itself a core value here.
"Courage" supports Growth or Meaning, depending on what it was in service of — it is not itself a core value here.
If two candidates are really the same underlying tradeoff wearing different clothes, merge them into the deeper one instead of listing both.

Order matters: list the strongest value first — the one whose tradeoff explains the widest range of decisions — down to the value with the narrowest (but still multi-situation) support.

Format each item as two lines separated by a newline character (\\n):
Line 1: a single recognizable word or short phrase naming the value (e.g. "Freedom", "Growth", "Meaning")
Line 2: one evidence PARAGRAPH (2–3 sentences) naming the tradeoff and explaining why this side keeps winning — second person, concrete about the pattern across multiple situations, without naming the specific real-life situations

Good:
"Freedom\\nWhen certainty and autonomy compete, you keep giving up the certainty. That choice shows up across very different kinds of decisions, not one repeated situation. When a path offers more security but less room to decide for yourself, you consistently pass on it."
"Growth\\nYou keep accepting discomfort over comfort because you believe growth matters more, and this isn't a one-time leap — it's the same call, made again and again, in situations that have nothing else in common."

Bad:
"Independence\\nYou are an independent person" — restates the label, no tradeoff
"Curiosity\\nYou find creative solutions" — this is a supporting behavior dressed up as a value; it belongs inside the evidence for Growth, not as its own entry
"Stability\\nMaybe you value some stability" — hedged, not evidence-grounded
Returning 4, 5, or 6 loosely-related values instead of merging down to the 3 that actually explain the person

Rules:
- Exactly 3 values, no more, no fewer
- Value name is one word or a very short phrase — immediately recognizable, not a sentence
- Evidence line names the tradeoff (what competed, what won) and is a short paragraph (2–3 sentences) — it should make clear this value shows up across MULTIPLE unrelated decisions, not one
- Merge overlapping values into the deepest one rather than listing near-duplicates or supporting behaviors
- Strongest, widest-explaining value first; narrower ones after
- These should feel immediately obvious — the kind of thing where the reader thinks "yeah, obviously"

---

afraid_of_becoming (What You Fear Becoming):
Do NOT generate fears by taking the opposite of a value. That produces a template, not a person — "Freedom → losing autonomy" is generic and could apply to anyone who values freedom. Reflection should never feel templated.

Instead ask: "What future does this person repeatedly avoid through their choices?" Look for repeated avoidance, not just the mirror image of what they pursue — a specific direction they keep steering away from across the evidence, not the logical opposite of a value you already wrote.

This matters because two people can hold the identical value and still fear different things, because they've lived different lives:
Two people both value Freedom.
One repeatedly avoids external expectations — their fear: "Living someone else's life."
Another repeatedly avoids dependence — their fear: "Becoming someone who cannot stand on their own."
Same value. Different fear, because the avoidance pattern in their actual evidence is different.

Return AT MOST 3 items, and only the ones clearly supported by a genuine, repeated avoidance pattern in the evidence — fewer is fine, never forced to hit 3.

Do NOT describe psychological fears or anxieties ("afraid of failure," "worried about money"). Describe the identity this person's choices consistently move away from.

Good (grounded in what's actually avoided, not a mechanical inversion):
"Living someone else's life."
"Becoming someone who cannot stand on their own."
"Staying somewhere you've already outgrown because leaving feels riskier than staying."

Bad:
"Afraid of failure" — anxiety, not an avoided identity
"Worried about disappointing people" — a feeling, not an identity
"Losing freedom" written simply because "Freedom" is a value — that's the opposite-of-value template this section exists to avoid
"Being unsuccessful" — vague, not a real identity

Rules:
- At most 3, never padded to a target count — omit any fear that isn't clearly supported
- Phrased as an avoided identity or trajectory, not a feeling
- Each fear must be traceable to a specific, repeated avoidance pattern in the evidence — not derived by negating a value
- The values and fears should together explain the person's identity, but a fear does not need to correspond to any single value one-for-one

---

core_tension (Your Biggest Tension):
Identify the single most important recurring internal contradiction — the one that shows up across the widest range of decisions in the evidence. Only one.

This can be 1–3 short sentences: name both sides of the pull, and where useful, note how concretely it recurs. This should become one of the emotional centerpieces of the page.

Good:
"You want freedom. You also want stability. Nearly every major decision you've recorded has required choosing one over the other."
"You trust yourself deeply. You still wish someone understood what you're carrying."

Rules:
- Second person
- Name a genuine contradiction between two real, evidence-grounded pulls — not a vague generality
- Do not resolve the tension or advise on it — name it and stop
- Choose the ONE tension that recurs most widely, not every tension you can find

---

recent_growth (What's Changing):
Return up to 3 items — fewer is fine if the evidence only supports one or two. Each is a full sentence describing how the person's identity is CHANGING right now, not a permanent trait and not an isolated fragment.

Good:
"Recently you've become noticeably more comfortable making important decisions without external reassurance."
"You're increasingly willing to sit with an unresolved pull instead of forcing an early resolution."

Bad:
"Becoming more resourceful" — isolated fragment, not a full sentence, competency language
"Trusting intuition more" — fragment, not evolution
"Weighing independence against connection" — a static tension, not movement (that belongs in core_tension)

Rules:
- Full sentences, present-tense movement
- Describes a trajectory, not a snapshot
- No event references, no hedging, no competency language

---

themes:
4–6 entries from the approved vocabulary.
Include difficult themes (Disappointment, Uncertainty, Hurt, Frustration, Loneliness, Grief, Acceptance, Resilience) when the patterns genuinely support them.

---

Honesty rules:
Name friction, contradiction, and unresolved tension directly. Do not soften.
No motivational framing ("you're growing", "keep going").
No therapy language ("processing", "healing", "inner journey").
No trait lists, no competency language, no psychology jargon, no generic strengths.
No generic statements not grounded in repeated patterns.
The goal is not to flatter the user and not to criticize the user — it is to reveal the person their repeated choices consistently point toward, not the person the AI imagines them to be. Nothing is invented.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Write the Current Self identity portrait. First, internally identify the strongest recurring tradeoffs this person's decisions resolve in the same direction (e.g. Freedom over certainty, Growth over comfort) — do not begin from theme tags. Return JSON with: title (2–5 word character phrase), summary (exactly 2 paragraphs separated by a blank line, second person, pure character description — no concrete nouns from real life, no event references, no hedging), values (exactly 3 values that fall out of the strongest tradeoffs — what repeatedly wins when two meaningful things conflict, strongest first, merging supporting behaviors into the deeper value they serve rather than listing them separately — each a JSON string containing a short value name and a 2–3 sentence evidence paragraph naming the tradeoff, separated by \\n, e.g. "Freedom\\nWhen certainty and autonomy compete, you keep giving up the certainty."), afraid_of_becoming (at most 3 short phrases naming a repeatedly avoided future — derived from actual avoidance patterns in the evidence, NOT from negating a value — omit any that aren't clearly supported), core_tension (1–3 sentences naming the single most important recurring contradiction), recent_growth (up to 3 full sentences describing how the identity is currently evolving), themes (4–6 theme names).`,
    ),
});
