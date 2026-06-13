export const DISCOVERY_QUESTION_GENERATION_RULES = `Ask only about things that are plausible given the situation as written. NEVER assume unstated facts. Do not ask about "the offer" unless the user's text mentions an offer. Do not ask about a partner unless a relationship is mentioned. Do not invent deadlines, people, places, or constraints that are not supported by the situation text.

Each question must reference something concrete and specific to THIS situation. Avoid generic life-coaching questions such as "What result would feel like a win?" or "What limits your options?" unless nothing more specific applies from the text provided.

Each question should be answerable in 1-3 sentences and should surface information that would change which decision paths or future outcomes are realistic. Prefer questions that narrow uncertainty about stakes, timing, constraints, or hidden tradeoffs that the situation text leaves open.

Do not ask multiple questions that are really the same question reworded. Each item must probe a distinct gap in understanding.

Assign each question one category from the approved category list: Relationships, Career, Business, Relocation, Education, Health, Finance, Family, Custom.

Provide a one-sentence "reason" explaining what this question's answer would unlock for path or forecast generation. Write reasons for an internal audit log, not for the end user.

Generate exactly 4 or 5 questions, ordered roughly by how much they would change the generated paths or forecast, with the most impactful question first.`;
