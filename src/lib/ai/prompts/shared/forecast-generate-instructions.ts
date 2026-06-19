import {
  GENERATION_BAN_LIST,
  GENERATION_PREFERENCE_LIST,
} from "@/lib/ai/prompts/shared/crossroad-instructions";

export const FORECAST_GENERATE_RULES = `You are generating a forecast of 9-11 specific futures for this situation. Distribute them across the four arrays (active, hidden, blind_spots, wild_card) roughly as:
- active: 4-5 futures (most likely, most immediate)
- hidden: 2-3 futures (overlooked but plausible)
- blind_spots: 2-3 futures (specific to their details, they haven't considered)
- wild_card: 1-2 futures (low probability, high impact plot twists)

But the most important thing is NOT which array they go in — it's that every single future meets these rules:

RULE 1 — EVENT RULE (non-negotiable):
Every future must be a specific, observable event — something that either happens or doesn't, that the user would immediately recognize the moment it occurs.
Test: "Would the user know within a single day or week whether this happened?" If yes → valid. If no → rewrite.
Good: "Someone In The Group Saves You A Seat"
Good: "A Group Chat Gets Started And You're Added"
Good: "You Show Up Three Weeks In A Row Without Missing One"
Good: "Your Friend Asks Her Out Before You Do"
Bad: "Consistency Builds A Reputation" (process, not event)
Bad: "Connection Deepens Over Time" (pattern, not event)
Bad: "Trust Begins To Form" (abstract, not observable)

RULE 2 — SPECIFICITY RULE (non-negotiable):
Every future must reference at least one specific detail from the situation or context answers — a specific person mentioned, a place, a relationship, a constraint, a circumstance the user actually described.
Generic futures that could apply to ANY situation are not allowed. If a future would make sense in a completely different situation, it is not specific enough.
Good: "Someone In The Nursing Program Asks If You Want To Study Together" (uses nursing detail)
Good: "Your Coworker Friend Mentions Her To You First" (uses the specific friend detail)
Bad: "A New Connection Forms" (applies to any situation)
Bad: "An Opportunity Appears" (meaningless without context)

RULE 3 — SIGNALS RULE:
For each future, generate exactly 3 signals — concrete, observable things the user would notice in real life that indicate this future is starting to unfold. Each signal: 5-8 words, title case, specific to THIS future's event. Do not restate or paraphrase the title, and do not describe an absence of action.
Good signals for "Someone Saves You A Seat":
- "They Wave You Over When You Walk In"
- "Your Name Gets Used Before You Sit Down"
- "They Hold The Spot Without Being Asked"
Bad signals:
- Repeating the future title
- Truncated sentences from whyItMightHappen
- "Things Feel Different"
- Abstract nouns without actions

RULE 4 — CAST RULE (existing, keep):
Most situations involve more people than just the user and the one other person at the centre of the situation. When the situation or context answers mention or plausibly imply other people — coworkers, friends, mutual connections, teammates, family members — consider futures where THOSE people take independent action that changes the situation, not just futures driven by the user or the central other person. Do not invent specific named individuals or roles that are not implied by the situation or context. But DO use roles already implied — "a coworker," "a mutual friend," "a teammate," "a friend who also knows her" — as agents in their own right. Across active, hidden, and blind_spots combined, at least one future should involve a third party (someone other than the user and the central other person) taking an action that shapes the outcome — not merely noticing or reacting to what the user or central person does.
Good: "A Mutual Friend Asks Her Out First", "A Teammate Mentions Your Interest To Her Directly", "Her Friend Encourages Her To Make The First Move"
Bad: "Sarah From Accounting Confronts You" (invents a specific named person not implied by context); "Someone Notices The Dynamic" (third party only observes, does not act)

RULE 5 — SELF RULE (existing, keep):
When a situation centres on another person (a friend, coworker, romantic interest, family member), most futures tend to focus on that person's actions, responses, or what others say about the situation. But the user's own life continues independently of that person — new relationships, new circumstances, new interests, or changes the user makes on their own initiative. Across active, hidden, and blind_spots combined, at least one future should focus on the user's own life or relationships progressing on their own track — NOT as a reaction to or about the central other person, but as independent forward motion.
Good: "A New Friendship Fills The Space", "A New Friend Earns Trust In The Exact Place He Lost It", "You Redirect Energy Into Something New"
Bad: "You Feel Sad About Him" (still centred on the other person, just framed as the user's emotion); "You Wonder If You Made The Right Call" (still about the decision/the other person, not independent life progression)

RULE 6 — WILD CARD RULE:
The 1-2 wild card futures must be genuine plot twists — low probability, high impact, specific to the situation's actual details. They should make the user think "I never considered that but it could actually happen." A wild card that merely restates an active/hidden/blind-spot future at lower confidence does not qualify.
Good: "Someone From One Of The Old Friendships Shows Up At The Same Group" (uses the specific past-hurt-friendships detail)
Bad: "An Unexpected Opportunity Appears" (too vague)

ANTI-PATTERNS — never generate these:
- Futures that are philosophical observations ("Patience Becomes Its Own Lesson")
- Futures that are processes ("Trust Builds Gradually")
- Futures that are psychological or internal states ("Loneliness Sharpens Your Awareness", "You Gain Clarity", "You Find Peace") — rewrite as an external event, discovery, or social consequence instead
- Futures that repeat across sections with slight variations ("You Feel Ready" and "You Feel More Ready")
- Futures that could appear in literally any situation
- Obvious direct continuations of the question the user is already asking themselves (e.g., "Will They Text Me", "You Reach Out First") with no new information attached — build the future around what's missing for the user instead: hidden information, another person getting involved, a fact that reframes the situation, an assumption that might be wrong, or an indirect consequence

Distinctness rule (existing, keep): every future across active, hidden, and blind_spots must represent a DIFFERENT underlying mechanism or trigger — not a variation, escalation, or restatement of another future's idea in the same set. Before finalising, check each pair of futures: if two futures would happen for essentially the same reason, merge them into one sharper future and replace the other with a future about a genuinely different mechanism. Vary the people involved, the consequence, and the mechanism across the set — never generate the same future twice with different wording.

Discovery rule (existing, keep): the strongest futures come from new information surfacing, not new feelings. Across active, hidden, and blind_spots combined, at least two futures should involve one of: hidden information becoming available, a third party revealing something, the original situation being recontextualized by a fact the user didn't have, or a social consequence playing out among people connected to the situation.
Good: "A Mutual Friend Reveals A Conversation You Were Never Supposed To Hear", "You Discover The Girl Saw The Situation Completely Differently", "You Learn He Told Different People Different Versions Of The Story"
Bad: "You Feel More At Peace With What Happened" (internal state, no new information); "You Reflect On What It Meant" (introspection, not a discovery)

Check-in history rule (applies only when checkInSummaries is present in context):
When checkInSummaries contains one or more entries, treat them as a record of what has actually happened since the original forecast. Each entry is a reality summary the user wrote after checking in. Before generating futures:
- Read each summary in chronological order (oldest first).
- Identify any futures from the original set that have clearly already happened, clearly been refuted, or are no longer relevant given what occurred.
- Ask: which futures became MORE likely because of what happened? Which became IMPOSSIBLE or already resolved? What NEW futures only became possible because of what happened? Build the next forecast from those answers, applying the same event, specificity, cast, and self rules above.
- Do NOT include futures that have already resolved. Do NOT repeat situations the check-in confirms are settled.
- Generate a forecast that reflects where things stand NOW — given the full check-in history — not just the original situation. The forecast should feel updated by reality, not a re-run of the original.
Good: If a check-in says "she agreed to meet up", don't generate "She Says Yes On The First Ask" — it already happened. Do generate what might happen NEXT given that it happened.
Bad: Ignoring the check-in history and regenerating the same futures as the original forecast.

Each future object needs:
- title: short scene-level headline (2-6 words)
- why: one sentence grounded in real-world dynamics — social incentives, human behavior, information gaps, or observable circumstances. Not therapy language, generic growth language, or abstract personal-development reasoning.
- impact: one sentence on what visibly changes outside the user's head when it happens — a relationship, a social dynamic, an opportunity, what other people now know or do. Not a feeling, realization, or internal state.
- signals: exactly 3 signals as described in RULE 3 above — 5-8 words each, title case, specific to this future, never a restatement of the title.
- timeframe: one of "days", "weeks", "months", "longer_term" — your honest estimate of how soon this future could realistically happen, based on its own content (not based on which array it's in). A wild card can be "days" if it's immediate; an active future can be "longer_term" if it naturally takes time. Judge each future on its own merits.

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
