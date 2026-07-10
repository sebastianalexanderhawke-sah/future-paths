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

export const CROSSROAD_PATH_RULES = `Path rules (Situation Paths — direction generation):

What a path is:
- A path is a DIRECTION this person's life could take from here — not another way to implement the same plan.
- Implementations change the first step. Directions change where the road leads.
- You are not answering "What are different ways to solve this?" You are answering: "What fundamentally different directions could this person's life take from here?"
- The test of distinctness: if two paths became reality, would this person's life look meaningfully different one year later? If both roads arrive at the same place, they are ONE path — merge them and look for a genuinely different direction.

Path count — 3 minimum, 5 maximum:
- Start with the 3 most meaningful genuinely different directions the situation supports.
- Add a 4th or 5th path ONLY if it is another genuinely different direction — never to reach a count. Stop as soon as another path would no longer introduce a genuinely different destination.
- If only three truly different directions exist, return three. Three different roads are worth more than five variations of one road. Never generate filler.
- Do not judge path count by how serious the decision seems. Judge it by how many genuinely different destinations the evidence supports.

direction field (required on every path):
- A 2-5 word label naming where this road leads — the destination, not the first action.
- Good: "a bigger, team-led business", "a smaller, calmer business", "life after this friendship", "the same life, renegotiated", "a different city entirely".
- Bad: "hire a freelancer" (an action, not a destination), "take action" (no destination at all).
- Every path's direction must differ in substance, not wording. If two candidate paths would carry the same direction, they are the same path — merge them before responding.

Forbidden differentiation (strict): two paths must NEVER differ only by
- tool or agent (AI vs freelancer vs contractor vs software)
- timing (now vs later vs after a milestone)
- scale or degree (a small step vs a big step of the same move)
- sequence (the same steps in a different order)
- confidence or wording
Those are implementations of one direction. Collapse them into the single strongest version and use the freed slot for a different direction — or return fewer paths.

Bad set (five implementations of "delegate the same work"): "Hire A Freelancer" / "Hire A Niche Freelancer" / "Use AI" / "Use AI Plus A Freelancer" / "Improve Your AI Workflow".
Good set (five directions): "Build A Team" / "Simplify The Business" / "Change The Business Model" / "Stay Intentionally Solo" / "Pause Growth To Strengthen The Foundation".

Assumption-challenge rule (required): at least one path must question an assumption embedded in the user's framing, and name that assumption in its challenges_assumption field as one plain sentence (e.g. "That the business should keep growing.", "That this friendship must either resume or be mourned.", "That the career has to be chosen now rather than tested."). All other paths set challenges_assumption to an empty string.
- The challenging path must still be realistic and grounded in this person's actual situation — the goal is revealing a possibility the user may not have considered, never novelty for its own sake.
- Whole categories the user's framing tends to hide: making the problem smaller instead of solving it, changing the objective itself, letting someone else own the problem entirely, changing the environment instead of the behavior, deliberately moving the decision to a later chapter of life.

Who is making this decision (decisionMaker context, when present):
- decisionMaker is stable behavioral evidence about this person: strongestPatterns (behavior patterns with stage and trend), recurringTradeoffs (which side of a recurring tension their behavior keeps favoring), stability (how settled their identity is right now), and topDirections (identities their life is already bending toward).
- Use it to make directions personal. At least one direction should extend something this person already demonstrably does (a strong pattern or top direction). At least one should deliberately run against a recurring tradeoff — the road they keep not taking is often the direction they cannot see.
- Express this in plain situation language. Never echo pattern slugs, identity names, or any system vocabulary in the output, and never treat decisionMaker as facts about this situation — it describes tendencies, not events.

Regeneration (regenerationFeedback context, when present):
- A previous path set for this situation was rejected for insufficient diversity, for the reasons given. Produce a genuinely NEW set that fixes every named issue — do not resubmit the same paths reworded.

- Each path must include a native title and a description.
- path.title must be 2-6 words, human-readable, direction-oriented, and stand on its own.
- Good titles: "Build A Team", "Simplify The Business", "Stay Intentionally Solo", "Let The Friendship End", "A Different City Entirely".
- Bad titles: sentence fragments, mid-sentence cuts, conjunction leftovers like "... And That", or titles copied from the description opening.
- Each path.description must expand the title into one concrete sentence about the road this path takes.
- Paths must read like distinct futures someone could actually choose to move toward.
- Do not generate therapy paths, coaching paths, or reflection-only paths.
- Do not generate sentence fragments or vague inner-work directions.

- Anti-fabrication rule: The situation summary and paths must not invent specific facts the user did not provide — no fabricated timeframes ("a year ago"), no fabricated prior actions ("you already told him..."). Stick to what was actually said. For anything unspecified, use open or hedged language ("at some point," "after a falling out") rather than inventing specifics. Before finalising, check: does any path assume or contradict a detail that was invented rather than stated by the user? If so, remove the invented detail from the summary and adjust the path.

- Respect-the-answer rule: Any explicit judgment, belief, or fact the user stated in their context answers is a hard constraint, not a suggestion to weigh against other options. A path's title, description, benefits, consequences, and future_shift must never assert or rely on something the user already explicitly ruled out. Paths may still explore an action the user dismissed (e.g. apologizing) as long as the path's own text does not contradict the user's stated belief about it.
  Bad: user answer "An apology would not change anything" → a path titled or described around "an apology is the only thing that could change things."
  Good: user answer "An apology would not change anything" → a path about apologizing anyway frames it as "closure for yourself, not because it changes her mind" — consistent with what the user said.
  Before finalising, check each path against every context answer: does this path state or imply the opposite of something the user explicitly said? If so, rewrite the path to fit what the user actually said.

- Final distinctness check (internal — never shown in the output): before responding, silently take every pair of paths and ask "If each became reality, would this person's life look meaningfully different one year from now?" Two paths that take different actions but converge on the same life outcome are not distinct — merge them, and either find a genuinely different direction or return fewer paths. Do not mention this verification anywhere in the response.

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
