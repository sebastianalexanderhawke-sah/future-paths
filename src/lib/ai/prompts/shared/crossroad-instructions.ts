export const GENERATION_BAN_LIST = `Generation ban list (strict — do not use unless the user explicitly requests it):
- reflection, reflect further, self-awareness, inner landscape, closure, seek closure
- curiosity about yourself, healing, growth journey, emotional processing
- understanding yourself, explore your feelings, gain clarity, learn more about yourself
- process emotions, better understanding, personal growth as a vague outcome
- therapy-style coaching, feelings work, sitting with uncertainty as the main payoff
- paths named like "Reflect Further", "Seek Closure", "Explore Your Feelings", "Understand Yourself Better"`;

export const GENERATION_PREFERENCE_LIST = `Generation preference list (use these instead):
- actions, events, relationships, opportunities, failures, successes
- promotions, friendships, partnerships, deadlines, relocations
- rejections, commitments, turning points, messages sent, offers accepted or declined
- concrete outcomes the user could observe in real life within months`;

export const CROSSROAD_PATH_RULES = `Path rules (Decision Simulator):
- Default to exactly 5 distinct strategies. Only generate 6 or 7 if the situation genuinely supports that many MEANINGFULLY DISTINCT approaches — each representing a different underlying strategy or posture, not a variation of another path. Do not pad to reach 6 or 7, and never exceed 7.
- Each path must include a native title and a description.
- path.title must be 2-6 words, human-readable, strategy-oriented, and stand on its own.
- Good titles: "Ask Her Out", "Friendship First", "Launch The MVP", "Find A Co-Founder", "Take The Job", "Stay Where You Are".
- Bad titles: sentence fragments, mid-sentence cuts, conjunction leftovers like "... And That", or titles copied from the description opening.
- Each path.description must expand the title into one concrete sentence about the strategy.
- Paths must read like distinct strategies someone could actually choose.
- Do not generate therapy paths, coaching paths, or reflection-only paths.
- Do not generate sentence fragments or vague inner-work directions.

- Anti-fabrication rule: The situation summary and paths must not invent specific facts the user did not provide — no fabricated timeframes ("a year ago"), no fabricated prior actions ("you already told him..."). Stick to what was actually said. For anything unspecified, use open or hedged language ("at some point," "after a falling out") rather than inventing specifics. Before finalising, check: does any path assume or contradict a detail that was invented rather than stated by the user? If so, remove the invented detail from the summary and adjust the path.

- Respect-the-answer rule: Any explicit judgment, belief, or fact the user stated in their context answers is a hard constraint, not a suggestion to weigh against other options. A path's title, description, benefits, consequences, and future_shift must never assert or rely on something the user already explicitly ruled out. Paths may still explore an action the user dismissed (e.g. apologizing) as long as the path's own text does not contradict the user's stated belief about it.
  Bad: user answer "An apology would not change anything" → a path titled or described around "an apology is the only thing that could change things."
  Good: user answer "An apology would not change anything" → a path about apologizing anyway frames it as "closure for yourself, not because it changes her mind" — consistent with what the user said.
  Before finalising, check each path against every context answer: does this path state or imply the opposite of something the user explicitly said? If so, rewrite the path to fit what the user actually said.

- Distinct-strategy rule: Paths must represent genuinely different approaches, not the same underlying strategy said two different ways. Before finalising, check each pair of paths: if both paths would lead the user to do essentially the same thing (e.g. two variations of "reach out and explain yourself"), merge them and replace one with a path built on a different underlying posture — for example, when the situation involves another person, draw from a mix of postures like: re-engage/reconnect, confront/address directly, create distance, accept and let go, or seek closure without re-engaging. Not every situation supports all of these, but no two paths should land on the same posture.

- Move-on rule: When the situation centres on whether to reconnect, re-engage, or pursue something involving another person, at least one path must represent deliberately choosing NOT to pursue it — accepting the situation as it stands and moving forward without re-engaging. This is a distinct, dignified choice, not the same as "wait and see" (which is passive and temporary). Only include this if genuinely relevant to the situation; not all situations involve a relationship to disengage from.`;

export const CROSSROAD_BENEFIT_RULES = `Benefit rules (2-4 per path):
- Benefits must describe observable outcomes — what happens if this path works.
- Good: "The friendship resumes.", "You receive a response within a week.", "Mutual trust rebuilds over time."
- Bad: "You gain clarity.", "You better understand your feelings.", "You learn something about yourself."
- Each benefit should describe an event, result, relationship change, or opportunity — not an internal insight.`;

export const CROSSROAD_CONSEQUENCE_RULES = `Consequence rules (2-4 per path):
- Consequences must describe costs, risks, or downsides — what could go wrong or hurt.
- Good: "The message may go unanswered.", "The friendship may not feel the same.", "The reconnection could feel awkward."
- Bad: "Reflection feels uncomfortable.", "Growth may require patience.", "You may need to sit with uncertainty."
- Each consequence should describe a realistic risk or tradeoff — not emotional homework.`;

export const CROSSROAD_FUTURE_SHIFT_RULES = `Future shift rules (future_shift field):
- Describe a concrete, situation-specific behavior change grounded in the exact people and circumstances of this situation — not a generic trait, inner state, or therapy outcome.
- Name the specific person, relationship, or circumstance from the situation rather than describing a general life skill that could apply to any situation.
- Good: "Brings up scheduling conflicts with her directly instead of letting them build up.", "Texts him back the same day instead of waiting to seem casual."
- Bad: "More self-aware.", "More reflective.", "More willing to initiate difficult conversations." (true of almost any situation — tie it to this one instead)
- Avoid the generic template "You may become someone who..." unless the rest of the sentence names this situation's specific people or circumstances rather than a universal trait.`;

export const CROSSROAD_FORECAST_OUTPUT_RULES = `Forecast output rules (benefits and consequences also feed Future Forecast):
- Treat every benefit as a likely future event: answer "What happens?"
- Treat every consequence as a hidden future risk: answer "What could happen that I am not considering?"
- Good futures: "The friendship resumes.", "You receive no reply.", "Another friend reconnects first.", "The conversation continues for months."
- Bad futures: "Gain clarity.", "Reflect further.", "Better understanding.", "Explore possibilities.", "Process emotions."
- Do not invent major details the user never mentioned, but stay concrete within the situation they gave you.`;

export const CROSSROAD_CURRENT_UNDERSTANDING_RULES = `Current understanding rules:
- One or two sentences summarizing the decision or situation in plain language.
- Focus on the external choice at stake — not the user's inner journey or need for self-discovery.`;

export const CROSSROAD_GENERATION_RULES = `${CROSSROAD_PATH_RULES}

${CROSSROAD_BENEFIT_RULES}

${CROSSROAD_CONSEQUENCE_RULES}

${CROSSROAD_FUTURE_SHIFT_RULES}

${CROSSROAD_FORECAST_OUTPUT_RULES}

${CROSSROAD_CURRENT_UNDERSTANDING_RULES}

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
