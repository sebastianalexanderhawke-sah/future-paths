export type DiscoveryQuestionCategory =
  | "Relationships"
  | "Career"
  | "Business"
  | "Relocation"
  | "Education"
  | "Health"
  | "Finance"
  | "Family"
  | "Custom";

export type SituationCategory =
  | "job_opportunity"
  | "relationship_work"
  | "graduation"
  | "starting_business"
  | "relocation"
  | "generic";

export type SituationMentionSignals = {
  offer: boolean;
  job: boolean;
  interview: boolean;
  hiring: boolean;
  relocation: boolean;
  destination: boolean;
  relationship: boolean;
  workCrush: boolean;
  business: boolean;
  customers: boolean;
  financial: boolean;
  family: boolean;
  health: boolean;
  education: boolean;
  reasonGiven: boolean;
  timelineGiven: boolean;
  oneOnOneMentioned: boolean;
  initiationMentioned: boolean;
};

export type SituationUnderstanding = {
  title: string;
  description: string;
  combinedText: string;
  normalizedText: string;
  primaryCategory: DiscoveryQuestionCategory;
  legacyCategory: SituationCategory;
  categoryScores: Record<DiscoveryQuestionCategory, number>;
  signals: SituationMentionSignals;
  subjectPronoun: "she" | "he" | "they";
};

const CATEGORY_TO_LEGACY: Partial<Record<DiscoveryQuestionCategory, SituationCategory>> = {
  Career: "job_opportunity",
  Relationships: "relationship_work",
  Education: "graduation",
  Business: "starting_business",
  Relocation: "relocation",
  Custom: "generic",
};

function scoreCategory(text: string, patterns: RegExp[], weight = 1): number {
  return patterns.reduce((score, pattern) => (pattern.test(text) ? score + weight : score), 0);
}

function detectSubjectPronoun(text: string): "she" | "he" | "they" {
  if (/\b(she|her|girl|woman|female)\b/i.test(text)) {
    return "she";
  }

  if (/\b(he|him|guy|boy|man|male)\b/i.test(text)) {
    return "he";
  }

  return "they";
}

function buildMentionSignals(text: string): SituationMentionSignals {
  return {
    offer: /\b(offer|offered|offer letter)\b/i.test(text),
    job: /\b(job|role|position|employer|work at|new job|current job|leave my job|take a new job)\b/i.test(
      text,
    ),
    interview: /\b(interview|interviewing|interviewed)\b/i.test(text),
    hiring: /\b(hiring|hire|hired|recruiter|application)\b/i.test(text),
    relocation: /\b(relocat|moving|move cities|move to|new city|another city|move away)\b/i.test(
      text,
    ),
    destination: /\b(to [a-z]+|in [a-z]+|dallas|austin|nyc|new york|seattle|denver|chicago|boston|la|l\.a\.)\b/i.test(
      text,
    ),
    relationship: /\b(girl|guy|crush|date|dating|relationship|romantic|like.*(him|her|them)|love)\b/i.test(
      text,
    ),
    workCrush: /\b(at work|coworker|colleague|office)\b/i.test(text) && /\b(like|crush|interested)\b/i.test(text),
    business: /\b(business|startup|company|found|launch|entrepreneur|self[- ]employed)\b/i.test(text),
    customers: /\b(customer|client|buyer|market|sales)\b/i.test(text),
    financial: /\b(money|financial|afford|savings|debt|runway|salary|income|cost)\b/i.test(text),
    family: /\b(family|parent|spouse|partner|wife|husband|kids|children|mother|father)\b/i.test(text),
    health: /\b(health|doctor|therapy|medical|diagnosis|treatment|fitness|mental health)\b/i.test(text),
    education: /\b(graduat\w*|college|university|school|degree|diploma|major|campus)\b/i.test(text),
    reasonGiven: /\b(because|since|due to|reason is|main reason|biggest reason|so that)\b/i.test(text),
    timelineGiven: /\b(by \w+|within \w+|deadline|soon|months?|weeks?|years?|when do i)\b/i.test(text),
    oneOnOneMentioned: /\b(one[- ]on[- ]one|alone together|just us|private time)\b/i.test(text),
    initiationMentioned: /\b(initiat\w*|starts conversations|texts first|reaches out)\b/i.test(text),
  };
}

function scoreCategories(text: string): Record<DiscoveryQuestionCategory, number> {
  const scores: Record<DiscoveryQuestionCategory, number> = {
    Relationships: scoreCategory(
      text,
      [
        /\b(girl|guy|crush|date|dating|relationship|romantic|like.*work|coworker|colleague)\b/i,
        /\b(ask (her|him|them) out|single|interested in someone)\b/i,
      ],
      2,
    ),
    Career: scoreCategory(
      text,
      [
        /\b(job|career|offer|interview|promotion|role|employer|hiring|leave my job|take a new job)\b/i,
      ],
      2,
    ),
    Business: scoreCategory(
      text,
      [/\b(business|startup|company|found|launch|entrepreneur|self[- ]employed)\b/i],
      2,
    ),
    Relocation: scoreCategory(
      text,
      [/\b(relocat|moving|move cities|move to|new city|another city|move away)\b/i],
      2,
    ),
    Education: scoreCategory(text, [/\b(graduat\w*|college|university|school|degree|diploma)\b/i], 2),
    Health: scoreCategory(text, [/\b(health|doctor|therapy|medical|diagnosis|mental health)\b/i], 2),
    Finance: scoreCategory(text, [/\b(money|financial|afford|savings|debt|runway|salary|income)\b/i], 2),
    Family: scoreCategory(
      text,
      [/\b(family|parent|spouse|partner|wife|husband|kids|children)\b/i],
      2,
    ),
    Custom: 0,
  };

  if (scores.Relocation > 0 && scores.Career > 0 && !/\b(offer|job|role|employer|hiring|interview)\b/i.test(text)) {
    scores.Relocation += 2;
  }

  if (/\bthinking about moving\b/i.test(text) && !scores.Career) {
    scores.Relocation += 3;
  }

  return scores;
}

function pickPrimaryCategory(
  scores: Record<DiscoveryQuestionCategory, number>,
): DiscoveryQuestionCategory {
  const ranked = (Object.entries(scores) as Array<[DiscoveryQuestionCategory, number]>)
    .filter(([category]) => category !== "Custom")
    .sort((left, right) => right[1] - left[1]);

  if (!ranked[0] || ranked[0][1] <= 0) {
    return "Custom";
  }

  return ranked[0][0];
}

export function understandSituation(title: string, description = ""): SituationUnderstanding {
  const combinedText = [title.trim(), description.trim()].filter(Boolean).join("\n");
  const normalizedText = combinedText.toLowerCase();
  const categoryScores = scoreCategories(normalizedText);
  const primaryCategory = pickPrimaryCategory(categoryScores);
  const legacyCategory = CATEGORY_TO_LEGACY[primaryCategory] ?? "generic";

  return {
    title: title.trim(),
    description: description.trim(),
    combinedText,
    normalizedText,
    primaryCategory,
    legacyCategory,
    categoryScores,
    signals: buildMentionSignals(normalizedText),
    subjectPronoun: detectSubjectPronoun(normalizedText),
  };
}

export function classifySituation(situationText: string): SituationCategory {
  return understandSituation(situationText).legacyCategory;
}
