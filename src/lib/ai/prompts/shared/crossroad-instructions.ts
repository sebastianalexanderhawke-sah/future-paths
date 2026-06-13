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
- Generate exactly five distinct strategies — not five variations of the same idea.
- Each path must include a native title and a description.
- path.title must be 2-6 words, human-readable, strategy-oriented, and stand on its own.
- Good titles: "Ask Her Out", "Friendship First", "Launch The MVP", "Find A Co-Founder", "Take The Job", "Stay Where You Are".
- Bad titles: sentence fragments, mid-sentence cuts, conjunction leftovers like "... And That", or titles copied from the description opening.
- Each path.description must expand the title into one concrete sentence about the strategy.
- Paths must read like distinct strategies someone could actually choose.
- Do not generate therapy paths, coaching paths, or reflection-only paths.
- Do not generate sentence fragments or vague inner-work directions.`;

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
- Describe a trait or habit created by repeated action — not an inner state or therapy outcome.
- Good: "More willing to initiate difficult conversations.", "More comfortable accepting uncertainty when reaching out.", "More decisive when opportunities appear."
- Bad: "More self-aware.", "More reflective.", "More connected to your inner world.", "Someone who leads with reflection before motion."
- Use "You may become someone who..." only when the trait is behavioral and observable in daily life.`;

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
