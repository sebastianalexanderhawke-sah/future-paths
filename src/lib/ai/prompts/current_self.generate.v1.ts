import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "10",
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
Write EXACTLY 2 paragraphs. No more. Second person ("You...").
Separate the two paragraphs with a blank line.

PARAGRAPH 1 — the hero insight. This is the first thing the user reads, alone at the top of the page. It must reveal the HIDDEN BELIEF this person's repeated choices point to — not the choices themselves. It answers one question: "What belief about life do this person's repeated choices reveal?"

Do NOT narrate behavior. Do NOT summarize situations. Do NOT list examples. Interpret them.

The paragraph moves through three beats, in one short paragraph of AT MOST 4–5 sentences:
1. The hidden belief — something this person has never quite said out loud but keeps acting on
2. The recurring identity that grew out of that belief — who acting on it has quietly made them
3. One memorable concluding sentence

The reader should finish it thinking: "I've never thought about myself that way before... but that's exactly me."

Style standard (do NOT copy or paraphrase this — match its register only):
"You seem less afraid of failing than of becoming someone who let uncertainty decide their life. Again and again, you've chosen movement over waiting, and that instinct has quietly become part of who you are."

The writing must feel psychologically insightful, emotionally honest, calm, compassionate, and memorable. Never:
- "Reflection thinks..." / "Reflection believes..." / "Reflection noticed..." — present the insight directly, never attribute it
- therapy language or personality-test language
- poetic metaphors

PARAGRAPH 2 — the deeper portrait, 1–2 sentences. Describes enduring character: how this person thinks, decides, handles pressure, values things, relates to uncertainty.

Both paragraphs — balanced, honest, warm, never flattering, never harsh.

The context JSON shows what happened. Use it to UNDERSTAND the person. Never use it as source material for the summary. The summary does not contain any evidence. Evidence lives in the values, afraid_of_becoming, and core_tension fields.

Self-check before writing each sentence: Remove every concrete noun (job, move, concert, city, person, friendship, debt, callback). If the sentence still makes sense, it's correct. If it collapses without those nouns, rewrite it in character terms only.

Bad examples — do not write like this:
"You act before conditions are favorable..."  ← describes the behavior instead of the belief underneath it
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
This is the twin of the values section, and it must read as its sibling — same three-part shape, opposite direction. Where a value is a life this person is building, a fear is a life they are quietly leaving behind. It is NOT a list of anxieties, and it is NOT the opposite of the values above. It answers one question: if this person's deepest values slowly went quiet, who would they wake up as?

Do NOT negate a value to make a fear. "Freedom → losing autonomy" is a concept, not a person — it could belong to anyone, and Reflection should never feel templated. "Losing autonomy," "becoming comfortable," "playing it safe" all describe ideas. Nobody can picture themselves inside an idea. Start instead from the futures this person's choices repeatedly steer away from: a specific direction they keep refusing across the evidence.

Each fear is a FUTURE VERSION OF THIS PERSON — someone the reader can picture meeting. This is the mirror image of a Future Self. Future Selves asks "who could I become?"; this asks "who do my repeated choices keep quietly ensuring I never let myself become?"

The tone is PROTECTIVE, not frightening. The reader should finish each fear thinking "I understand why this future matters to me" — never "this app is trying to scare me." Compassionate, reflective, personal. You are showing someone the life they keep refusing, and honoring the choices by which they refuse it — not threatening them with it.

FORMAT — each item is a SINGLE JSON string containing THREE parts separated by newline characters (\\n), exactly like the values field but with three lines instead of two:
Line 1 — Theme: a one-word (occasionally two-word) label for the future identity. It is NOT the fear itself; it is the name of the version of them. E.g. Settling, Regret, Dependence, Conformity, Isolation, Stagnation, Disconnection, Cynicism, Resignation.
Line 2 — Identity statement: ONE vivid sentence naming the future version of the person. This is the emotional centerpiece — it should create an immediate image. Forms like "Becoming someone who…" or "Building a life that…" or "Looking back and…". Not a label, not a trait, not a diagnosis.
Line 3 — Supporting paragraph: 2–3 sentences explaining why Reflection believes this future matters, grounded in the repeated evidence. Do NOT restate the identity statement. Instead explain how this person's repeated choices show them actively moving AWAY from this future — so the fear reads as something their own pattern is already protecting them from. Compassionate and personal.

Two people can hold the identical value and still fear becoming completely different people, because they've avoided different futures:
Two people both value Freedom.
One keeps refusing other people's expectations. Their fear (theme / statement / paragraph):
"Conformity\\nWaking up years from now inside a life you never actually chose.\\nYou keep making the unpopular call when the expected one would be easier, and that pattern repeats across decisions that have nothing else in common. Each time you choose your own read over the approved one, you steer further from the version of you who simply did what was expected until it became a life."
The other keeps refusing to lean on anyone. Their fear:
"Isolation\\nBecoming someone so self-sufficient that no one is left close enough to reach.\\nYou've built real strength around handling things on your own — which is exactly why this version is a genuine risk, not a remote one. The moments you let something be shared instead of shouldered are what keep that future from quietly becoming permanent."
Same value. Different feared person, because the avoidance pattern in their actual evidence is different. (These are illustrative — do not reuse them.)

Return AT MOST 3, and only the futures clearly supported by a genuine, repeated avoidance pattern in the evidence — fewer is better than forced.

Bad (and why):
"Afraid of failure" — an anxiety, and not even a person
"Losing your freedom" — the opposite-of-value template this section exists to kill
A statement line reading "Becoming comfortable" or "Playing it safe" — a concept, not a future you can see yourself standing inside
A paragraph that just restates the statement in different words — it must add the evidence and the direction of movement, not echo

Rules:
- Exactly three newline-separated parts per item: Theme, Identity statement, Supporting paragraph
- At most 3 items, never padded to a target count — omit any feared future that isn't clearly supported by repeated avoidance in the evidence
- The identity statement is a future IDENTITY the reader can picture becoming — never a value, an opposite, a trait, or a psychological diagnosis
- Traceable to a specific, repeated avoidance pattern in the evidence — not derived by negating a value
- Protective and compassionate, never melodramatic, never a scare tactic
- The supporting paragraph names the evidence and shows the person moving away from this future; it never repeats the statement
- The values and fears together reveal the person; a fear need not correspond one-for-one to any single value

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

core_tradeoff (The Tradeoff You Live With):
Generate exactly ONE tradeoff — the recurring cost of this person's single most consistent behavioral pattern. Not several. Not a weakness. Not advice. It answers one question and only this question: "What recurring behavior has helped this person become who they are, and what recurring consequence has that same behavior created?"

The behavior in Part 1 is something that has genuinely helped them — it is why they are who they are. The consequence in Part 2 is the natural, repeated side effect of that same behavior, never framed as a flaw and never something to fix. Both halves describe the SAME behavior: one hand gives, the same hand costs.

Only produce this when a real, repeated pattern supports it across situations, check-ins, and reflections. If the evidence is insufficient, return null — omit the section entirely rather than inventing a cost. A fabricated tradeoff is worse than none.

FORMAT — a single JSON string with exactly THREE newline-separated parts (\\n), or null:
Part 1 — The recurring pattern: ONE sentence naming the behavior this person consistently repeats, in plain second person. It should read as something that has helped them become who they are.
Part 2 — The tradeoff: TWO or THREE concise sentences explaining the recurring consequence that same behavior has created. The natural side effect of the pattern, not a defect and not something to correct.
Part 3 — Reflection's observation: ONE sentence noting that this pattern has appeared repeatedly across their situations, check-ins, and reflections — not in a single moment. Do not advise, resolve, or tell them what to do.

Good (illustrative only — never reuse):
"You commit to a direction the moment it feels right, before you've fully weighed it.\\nThat decisiveness is why you've moved forward while others stalled, but it also means you rarely revisit a choice once it's made. Some directions that stopped fitting you kept their momentum simply because you'd already committed to them.\\nThis same pattern surfaces again and again across your situations, check-ins, and reflections, not in any one decision alone."

Bad:
"You are impatient" — a flaw stated as a flaw; no behavior, no both-sides
"You should learn to slow down" — advice; this section never prescribes
Two or more tradeoffs — return exactly one
A tradeoff with no clear repeated support in the evidence — return null instead

Rules:
- Exactly ONE tradeoff, in three newline-separated parts (recurring pattern, the tradeoff, Reflection's observation) — or null when the evidence is insufficient
- Part 1 is one sentence; Part 2 is two or three sentences; Part 3 is one sentence
- Both halves describe the same behavior — never a flaw, never criticism, never "you should"
- Grounded only in a pattern that repeats across situations, check-ins, and reflections
- Do not resolve the tradeoff or prescribe anything — reveal it and stop

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
      `Write the Current Self identity portrait. First, internally identify the strongest recurring tradeoffs this person's decisions resolve in the same direction (e.g. Freedom over certainty, Growth over comfort) — do not begin from theme tags. Return JSON with: title (2–5 word character phrase), summary (exactly 2 paragraphs separated by a blank line, second person — paragraph 1 is the hero insight, at most 4–5 sentences revealing the hidden belief this person's repeated choices point to, the recurring identity that grew out of it, and one memorable concluding sentence, interpreting rather than narrating behavior, never attributed to Reflection; paragraph 2 is a 1–2 sentence deeper character description — no concrete nouns from real life, no event references, no hedging, no therapy or personality-test language, no poetic metaphors), values (exactly 3 values that fall out of the strongest tradeoffs — what repeatedly wins when two meaningful things conflict, strongest first, merging supporting behaviors into the deeper value they serve rather than listing them separately — each a JSON string containing a short value name and a 2–3 sentence evidence paragraph naming the tradeoff, separated by \\n, e.g. "Freedom\\nWhen certainty and autonomy compete, you keep giving up the certainty."), afraid_of_becoming (at most 3 — each a JSON string with THREE newline-separated parts mirroring the values format: a short Theme label for the future identity (e.g. "Settling"), then a one-sentence Identity statement naming the future version of the person (e.g. "Becoming someone who slowly stopped believing in themselves."), then a 2–3 sentence Supporting paragraph that grounds it in repeated evidence and shows the person moving away from that future without restating the statement — protective and compassionate, never an abstract fear, a trait, or the opposite of a value; grounded in a real repeated avoidance pattern; omit any not clearly supported), core_tension (1–3 sentences naming the single most important recurring contradiction), core_tradeoff (exactly ONE tradeoff as a single JSON string with THREE newline-separated parts — Part 1: one sentence naming the recurring behavior that helped this person become who they are; Part 2: two or three sentences explaining the recurring consequence that same behavior created, as a natural side effect not a flaw and never advice; Part 3: one sentence noting the pattern recurs across situations, check-ins, and reflections — e.g. "You commit to a direction the moment it feels right.\\nThat decisiveness is why you've moved while others stalled, but you rarely revisit a choice once made, so some directions kept their momentum after they stopped fitting you.\\nThis pattern surfaces again and again across your situations, check-ins, and reflections."; return null if the evidence is insufficient), recent_growth (up to 3 full sentences describing how the identity is currently evolving), themes (4–6 theme names).`,
    ),
});
