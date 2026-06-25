import {
  buildDefaultUserPrompt,
  createPromptModule,
} from "@/lib/ai/prompts/shared/create-prompt-module";

export const currentSelfGenerateV1 = createPromptModule({
  promptId: "current_self.generate",
  promptVersion: "1",
  taskInstructions: `Produce a structured identity snapshot with four fields: title, summary, observations, and recent_growth.

---

title:
A short phrase — the most stable, enduring pattern visible right now. Not an event. Not a period. Who this person appears to be across many moments.

---

summary (identity paragraph):
2-4 sentences. Who this person IS — not what they did, not what happened to them.
Write as if you know this person but have no knowledge of their recent calendar.
Only describe character: what they value, how they make decisions, what tensions they carry.

Forbidden: any named situation, event, or time reference. Any causal chain. "After", "Since", "Because", "Across the past", "Following", "This happened because."

---

observations (core traits):
4-6 short bullets. Each is a single phrase or one short sentence.
Each describes a stable trait — something that would still be true in two months.
These are facts about who this person is, not what they are doing.

Required format: short, punchy, lowercase-first phrase.
Examples:
• Acts before certainty arrives
• Recovers quickly from setbacks
• Prefers direct communication
• Thinks independently under pressure
• Values stability without avoiding change
• Holds contradictions without resolving them immediately

Every bullet must stand alone. No "tends to" framing needed — just state the trait directly.
Forbidden: any event, time reference, situation name, or causal explanation.

---

recent_growth:
Exactly 3 bullets. These describe what is currently shifting — not permanent traits, not events.
Each answers: "What is changing in this person right now?"

Required format: present-tense movement phrase.
Examples:
• Becoming more comfortable making decisions alone
• Learning to tolerate uncertainty without forcing resolution
• Trusting personal judgment more than external validation
• Pulling away from consensus-seeking
• Moving toward clarity over approval

Forbidden: event references, situation names, past tense, causal explanations.
You MUST return exactly 3 items in this array.

---

themes:
4-6 entries from the approved vocabulary. Dynamic count — include a theme only when multiple data points support it. Include difficult themes (Disappointment, Uncertainty, Hurt, Frustration, Loneliness, Grief, Acceptance, Resilience) when the patterns support them.

---

Honesty rules:
- Name friction, contradiction, struggle, or unresolved tension directly. Do not soften.
- Uniformly positive output when evidence shows conflict is wrong.
- Thin data: write fewer bullets, not more.

Forbidden everywhere:
- Motivational language ("you're growing", "keep going")
- Therapy language ("processing", "holding space", "inner journey", "healing")
- Personality archetypes ("you are the type of person who")
- Generic statements not grounded in repeated patterns`,
  buildUserPrompt: (context) =>
    buildDefaultUserPrompt(
      context,
      "Produce JSON with title, summary, themes, observations (4-6 core trait bullets), and recent_growth (exactly 3 movement bullets).",
    ),
});
