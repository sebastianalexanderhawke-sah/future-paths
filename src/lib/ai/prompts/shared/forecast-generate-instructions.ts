import {
  GENERATION_BAN_LIST,
  GENERATION_PREFERENCE_LIST,
} from "@/lib/ai/prompts/shared/crossroad-instructions";

export const FORECAST_GENERATE_RULES = `Forecast generation rules (strict):
- Generate possible future realities — not benefits, consequences, personality shifts, or self-understanding.
- Every forecast must answer: "What could actually happen next?"
- Use the photograph test: "Could I take a picture of this?" If no, rewrite before responding.
- Do not derive forecasts from path benefits or consequences. Invent distinct future events grounded in the situation, selected path, and context answers.
- Distinctness rule: Every future across active, hidden, and blind_spots must represent a DIFFERENT underlying mechanism or trigger — not a variation, escalation, or restatement of another future's idea in the same set. Before finalising, check each pair of futures: if two futures would happen for essentially the same reason (e.g., both are "cost eats into the raise" or both are "someone notices the dynamic"), merge them into one sharper future and replace the other with a future about a genuinely different mechanism.

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

Each future object needs:
- title: short scene-level headline (2-6 words)
- why: one sentence on why this future might happen
- impact: one sentence on what changes in the user's life when it happens
- signals: exactly 3 short, concrete, distinct phrases (2-5 words each) that a careful observer could point to as early evidence this future is starting to happen. Each signal must reference a SPECIFIC detail from the situation, context answers, or selected path (names, numbers, places, dates, roles — whatever is concrete). Do not restate or paraphrase the title.
  Good signals example for a future titled "You Accept And Relocate" in a situation mentioning a $12→$20 pay change: "Pay jumps from $12 to $20", "Notice period at current job", "Moving logistics begin"
  Bad: "Acceptance Happens", "Relocation Occurs", "Decision Is Made" (these just restate the title)

${GENERATION_BAN_LIST}

${GENERATION_PREFERENCE_LIST}`;
