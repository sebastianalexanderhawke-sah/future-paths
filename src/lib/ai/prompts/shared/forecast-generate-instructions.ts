import {
  GENERATION_BAN_LIST,
  GENERATION_PREFERENCE_LIST,
} from "@/lib/ai/prompts/shared/crossroad-instructions";

export const FORECAST_GENERATE_RULES = `Check-in history rule (applies only when checkInSummaries is present in context):
When checkInSummaries contains one or more entries, treat them as a record of what has actually happened since the original forecast. Each entry is a reality summary the user wrote after checking in. Before generating futures:
- Read each summary in chronological order (oldest first).
- Identify any futures from the original set that have clearly already happened, clearly been refuted, or are no longer relevant given what occurred.
- Do NOT include futures that have already resolved. Do NOT repeat situations the check-in confirms are settled.
- Generate a forecast that reflects where things stand NOW — given the full check-in history — not just the original situation. The forecast should feel updated, not a re-run of the original.
Good: If a check-in says "she agreed to meet up", don't generate "She Says Yes On The First Ask" — it already happened. Do generate what might happen NEXT given that it happened.
Bad: Ignoring the check-in history and regenerating the same futures as the original forecast.

Forecast generation rules (strict):
- Generate possible future realities — not benefits, consequences, personality shifts, or self-understanding.
- Every forecast must answer: "What could actually happen next?"
- Use the photograph test: "Could I take a picture of this?" If no, rewrite before responding.
- Do not derive forecasts from path benefits or consequences. Invent distinct future events grounded in the situation, selected path, and context answers.
- Distinctness rule: Every future across active, hidden, and blind_spots must represent a DIFFERENT underlying mechanism or trigger — not a variation, escalation, or restatement of another future's idea in the same set. Before finalising, check each pair of futures: if two futures would happen for essentially the same reason (e.g., both are "cost eats into the raise" or both are "someone notices the dynamic"), merge them into one sharper future and replace the other with a future about a genuinely different mechanism.
- Self rule: When a situation centres on another person (a friend, coworker, romantic interest, family member), most futures tend to focus on that person's actions, responses, or what others say about the situation. But the user's own life continues independently of that person — new relationships, how an absence feels over time, new interests, or changes the user makes on their own initiative. Across active, hidden, and blind_spots combined, at least one future should focus on the user's own life, feelings, or relationships progressing on their own track — NOT as a reaction to or about the central other person, but as independent forward motion.
  Good: "A New Friendship Fills The Space", "The Loneliness Becomes Noticeable Before It Resolves", "You Redirect Energy Into Something New"
  Bad: "You Feel Sad About Him" (still centred on the other person, just framed as the user's emotion); "You Wonder If You Made The Right Call" (still about the decision/the other person, not independent life progression)
- Cast rule: Most situations involve more people than just the user and the one other person at the centre of the situation. When the situation or context answers mention or plausibly imply other people — coworkers, friends, mutual connections, teammates, family members — consider futures where THOSE people take independent action that changes the situation, not just futures driven by the user or the central other person. Do not invent specific named individuals or roles that are not implied by the situation or context. But DO use roles already implied — "a coworker," "a mutual friend," "a teammate," "a friend who also knows her" — as agents in their own right. Across active, hidden, and blind_spots combined, at least one future should involve a third party (someone other than the user and the central other person) taking an action that shapes the outcome — not merely noticing or reacting to what the user or central person does.
  Good: "A Mutual Friend Asks Her Out First", "A Teammate Mentions Your Interest To Her Directly", "Her Friend Encourages Her To Make The First Move"
  Bad: "Sarah From Accounting Confronts You" (invents a specific named person not implied by context); "Someone Notices The Dynamic" (third party only observes, does not act)

Active futures (active[]):
- Question they answer: "What seems most likely to happen next?"
- Generate 4-6 futures.
- Most plausible observable outcomes within the next months.
- Good: "She Says Yes To Coffee", "The Friendship Deepens First", "The First 10 Users Arrive"
- Bad: "Gain Clarity", "Reflect Further", "Better Understanding"

Hidden futures (hidden[]):
- Question they answer: "What future are you probably not considering?"
- Generate 3-5 futures.
- Less obvious but still realistic outcomes.
- Good: "You Receive No Reply", "A Competitor Launches First", "Launch Slips By Several Months"
- Bad: "Explore Possibilities", "Process Emotions", "Understand Your Feelings"

Blind spot futures (blind_spots[]):
- Question they answer: "What futures emerge from the details you provided?"
- Generate 3-5 futures.
- Must use specific details from the situation, selected path, and context answers.
- Good: "She Assumes You're Not Interested", "A Job Offer Delays The Launch", "An Early User Wants To Help Build It"
- Bad: "Inner Growth", "Develop Self-Awareness", "Learn More About Yourself"

Wild card futures (wild_card[]):
- Question they answer: "What could happen that you'd never expect?"
- Generate exactly 3 futures that would function as plot twists in this situation — low probability, high impact, completely grounded in the specific people and details the user provided.

These must pass the "I never even considered that" test. If a user would read a wild card future and think "yeah that's possible" without surprise, it belongs in active/hidden/blind_spots instead. Wild cards should produce a moment of "oh wow, that could actually happen and I never thought of it."

Requirements for each wild card:
- Must reference a SPECIFIC detail from the situation or context (a named person, a specific relationship, a concrete circumstance mentioned by the user) — not generic
- Must involve a genuine reframe — the situation looks fundamentally different if this happens
- Must be plausible in the real world — not fantastical
- Must NOT overlap with active, hidden, or blind spot futures in mechanism or outcome

Strong wild card patterns for relationship/person situations:
- The OTHER person in the situation takes unexpected action (e.g. "Your Friend Tells Her He Has Feelings For Her First")
- The user's OWN life shifts in a way that makes the situation irrelevant (e.g. "You Start Developing Feelings For Someone Else Before This Resolves")
- A structural change removes the context entirely (e.g. "You Get Moved To A Different Team And Lose Daily Proximity", "Her Nursing Program Assigns Her To A Different Location")
- A hidden truth surfaces that reframes everything (e.g. "She Tells A Mutual Friend She Has Already Noticed Your Interest", "Your Friend Admits He Has Feelings For Her Too")

Bad wild cards (do not generate these):
- "She Assumes You're Not Interested" — ordinary, belongs in hidden futures
- "You Never Learn How She Feels" — vague, not a plot twist
- "A One-on-one Opportunity Appears" — likely outcome, not wild
- Anything that could reasonably appear in active futures

Each future object needs:
- title: short scene-level headline (2-6 words)
- why: one sentence on why this future might happen
- impact: one sentence on what changes in the user's life when it happens
- signals: exactly 3 short, concrete, distinct phrases (2-5 words each) that a careful observer could point to as early evidence this future is starting to happen. Each signal must reference a SPECIFIC detail from the situation, context answers, or selected path (names, numbers, places, dates, roles — whatever is concrete). Do not restate or paraphrase the title.
  Good signals example for a future titled "You Accept And Relocate" in a situation mentioning a $12→$20 pay change: "Pay jumps from $12 to $20", "Notice period at current job", "Moving logistics begin"
  Bad: "Acceptance Happens", "Relocation Occurs", "Decision Is Made" (these just restate the title)
- timeframe: one of "days", "weeks", "months", "longer_term" — your honest estimate of how soon this future could realistically happen, based on its own content (not based on which section it's in). A future in blind_spots can be "days" if it's immediate; a future in active can be "longer_term" if it naturally takes time. Judge each future on its own merits.
  Examples: "He Sends A Second Message" after 6 months of silence → "months" or "longer_term". "You Stop Checking His Profile" → "weeks". "Mutual Friends Notice The Distance" → "months".

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
