import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

/**
 * Behavior Engine v4 (phase 4): Current Self generated from the Identity
 * Brief alone.
 *
 * This prompt is the explanation-mode counterpart of current_self.generate
 * (v10), which remains registered as the reversible legacy path. The output
 * contract is deliberately identical — same fields, same newline encodings,
 * same register — EXCEPT themes, which are derived deterministically from the
 * brief (deriveThemesFromBrief) rather than generated.
 *
 * What changed and why:
 * - Identity is already determined. The legacy prompt teaches the model to
 *   DISCOVER recurring tradeoffs across raw situations, check-ins, and
 *   reflection answers; here the deterministic engine has done that —
 *   signalRelations are the tradeoffs, recentChanges is the movement,
 *   stability/maturity is the calibration. The model only explains.
 * - The context carries no raw life data, so the portrait's hardest rules
 *   ("no concrete nouns", "never retell what happened") are structurally
 *   guaranteed instead of instruction-enforced — which is also why this
 *   prompt is a fraction of the legacy prompt's size.
 */
export const currentSelfGenerateFromBriefV1 = createPromptModule({
  promptId: "current_self.generate_from_brief",
  promptVersion: "1",
  taskInstructions: `You are writing a Current Self identity portrait from an Identity Brief — a precomputed, deterministic summary of one person's repeated real-life decisions. The portrait answers one question: Who have this person's repeated choices made them today?

The identity has ALREADY been determined by a deterministic behavior engine. Your job is to explain it in natural language — never to discover, re-derive, or second-guess it. Everything you write must be grounded in the brief. Nothing is speculative.

HOW TO READ THE BRIEF:
- topSignals — the person's repeated observable behaviors, strongest first. stage (glimpsed → emerging → established → defining) and confidence (0–1) say how settled each is; trend says how it is moving. representativeEvidence holds distilled observations of real decisions: use them to UNDERSTAND the person, never as material to quote or retell.
- signalRelations — the recurring tradeoffs of this person's life. Each is a tension between two opposing behaviors; "dominant" is the side that repeatedly wins, "confidence" is how lopsided the evidence is. These relations ARE the person's values and tensions. Do not invent others.
- stability and summary.maturity — how much evidence exists and how settled it is. Calibrate to this: a weak/forming profile earns a restrained portrait built on only the strongest one or two patterns; an established/settled one earns a fuller portrait. Never build more than the brief supports.
- recentChanges — which behaviors emerged, strengthened, weakened, went dormant, or returned recently.
- rankedFutures — directional context only. Never mention or describe them.

THE WRITING (every field):
- Second person ("You…"), calm, warm, honest — never flattering, never harsh.
- The reader's reaction should be "Yeah… that's me" — recognized, not analyzed.
- No concrete nouns from real life (jobs, moves, cities, people, dates, projects). The evidence texts steer you invisibly; never quote, cite, or retell them, and never reference "signals", "the brief", "evidence", or any other machinery.
- State conclusions directly and stop. No hedging inside statements ("tends to", "often", "seems"), no justifying claims, no meta-commentary.
- Never: therapy language, personality-test language, psychology jargon, competency words ("resilient", "growth-minded", "self-aware"), poetic metaphors, motivational framing, or attributing insights to Reflection ("Reflection noticed…").

Return JSON with:

title — a 2–5 word character phrase naming a tendency, not an event. Good: "Acts before certainty", "Quietly becoming independent". Bad: "Navigating a new chapter", "At a crossroads".

summary — EXACTLY 2 paragraphs separated by a blank line, and nothing else.
Paragraph 1 — the hero insight, at most 4–5 sentences. Reveal the HIDDEN BELIEF behind the dominant signals — something this person keeps acting on but has never quite said out loud — then the identity that has quietly grown out of acting on it, then one memorable concluding sentence. Interpret the pattern; do not describe behavior. Register (match it, never copy it): "You seem less afraid of failing than of becoming someone who let uncertainty decide their life."
Paragraph 2 — 1–2 sentences of enduring character: how this person decides, handles pressure, relates to uncertainty.
Self-check per sentence: remove every concrete noun; if the sentence collapses, rewrite it in character terms.

values — EXACTLY 3 items. A value is the dominant side of a recurring tradeoff: what repeatedly wins when two meaningful things conflict. Take them from the strongest signalRelations (name the dominant side as the deeper value it serves — "Freedom", "Growth", "Connection", "Meaning"); when fewer than three relations carry evidence, derive the rest from the strongest topSignals. Merge near-duplicates into the deeper value; never list a supporting behavior ("Curiosity", "Risk-taking", "Courage") as a value when it serves a deeper one. Strongest, widest-explaining value first.
Format per item — two parts separated by a newline character (\\n): "Name\\nEvidence paragraph". The name is one recognizable word or short phrase; the paragraph is 2–3 second-person sentences naming the tradeoff (what competed, what won) and making clear it recurs across unrelated decisions, without naming any real situation.

afraid_of_becoming — AT MOST 3 items; fewer is better than forced. Each is a future version of this person that their choices keep steering away from. Read the opposing sides of lopsided relations, the dormant signals, and avoidance-shaped behaviors for what this person repeatedly refuses. Never negate a value ("Freedom → losing autonomy" is banned); write a person someone could picture meeting, not a concept. Protective and compassionate: honor the refusal, never threaten.
Format per item — three parts separated by \\n: "Theme\\nIdentity statement\\nSupporting paragraph". Theme is one word (Settling, Isolation, Conformity, Stagnation…); the statement is ONE vivid sentence naming the future version of them ("Becoming someone who…"); the paragraph is 2–3 sentences showing how their repeated choices already move away from that future, without restating the statement.

core_tension — 1–3 sentences naming the single most important recurring contradiction: the relation where BOTH sides carry real evidence (high combined evidence, low lopsidedness). Name both pulls concretely and stop — never resolve it, never advise.

core_tradeoff — EXACTLY one, or null. The recurring cost of the single strongest established pattern: the same behavior that built this person and the natural consequence it repeatedly creates. One hand gives, the same hand costs — never a flaw, never advice.
Format — three parts separated by \\n: one sentence naming the recurring pattern that has helped them become who they are; two or three sentences explaining the recurring consequence that same behavior creates; one sentence noting the pattern recurs across their recorded history. Return null when maturity is weak or no signal has reached established — a fabricated tradeoff is worse than none.

recent_growth — up to 3 full sentences describing how the identity is changing RIGHT NOW, taken from recentChanges (emerged, strengthened, weakened, returned). Present-tense movement ("Recently you've become…", "You're increasingly…"), never a snapshot, never a static tension, no fragments.`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      `Write the Current Self identity portrait from the Identity Brief in the context. The identity is already determined — explain it, never re-derive it. Return JSON with: title (2–5 word character phrase), summary (exactly 2 paragraphs separated by a blank line — paragraph 1 the hidden-belief hero insight in at most 4–5 sentences, paragraph 2 a 1–2 sentence character description), values (exactly 3 "Name\\nEvidence paragraph" items from the dominant sides of the strongest relations), afraid_of_becoming (at most 3 "Theme\\nIdentity statement\\nSupporting paragraph" items from repeated avoidance), core_tension (1–3 sentences on the most evidenced two-sided relation), core_tradeoff (one "Pattern\\nConsequence\\nRecurrence" item, or null when evidence is weak), recent_growth (up to 3 full sentences from recentChanges).`,
    ),
});
