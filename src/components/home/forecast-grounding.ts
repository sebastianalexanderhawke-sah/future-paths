export type GroundingBundle = {
  situationTitle: string;
  contextSummary: string | null;
  selectedPathTitle: string | null;
  pathText: string[];
  corpus: string;
  tokens: Set<string>;
};

const STOP_TOKENS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "with",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "from",
  "your",
  "you",
  "this",
  "that",
  "it",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "because",
  "while",
  "if",
  "what",
  "which",
  "who",
  "whom",
  "i",
  "me",
  "my",
  "we",
  "our",
  "they",
  "them",
  "their",
  "he",
  "she",
  "her",
  "his",
  "him",
]);

const INVENTED_TOPIC_CHECKS: Array<{ topic: RegExp; requiresMention: RegExp }> = [
  { topic: /\brun(ning)? club\b/i, requiresMention: /\brun(ning)?|jog(ging)?|marathon|5k|10k\b/i },
  { topic: /\brun club\b/i, requiresMention: /\brun(ning)?|jog(ging)?|marathon|5k|10k\b/i },
  { topic: /\bgym\b/i, requiresMention: /\bgym|fitness|workout|lifting|weights\b/i },
  { topic: /\bfitness\b/i, requiresMention: /\bfitness|workout|gym|athletic|exercise\b/i },
  { topic: /\bathletic(s| club)?\b/i, requiresMention: /\bathletic|sport|sports|team|game\b/i },
  { topic: /\byoga\b/i, requiresMention: /\byoga\b/i },
  { topic: /\bhiking\b/i, requiresMention: /\bhike|hiking|trail\b/i },
  { topic: /\bchurch\b/i, requiresMention: /\bchurch|faith|worship\b/i },
  { topic: /\bvolunteer(ing)?\b/i, requiresMention: /\bvolunteer(ing)?\b/i },
  { topic: /\bbook club\b/i, requiresMention: /\bbook club|reading group\b/i },
  { topic: /\bmutual friend\b/i, requiresMention: /\bfriend|friends|mutual|hangout|group|girl|guy|work\b/i },
  { topic: /\bcoworker\b/i, requiresMention: /\bwork|office|colleague|coworker|job|role|dallas|move|relocat\b/i },
  { topic: /\bshe\b/i, requiresMention: /\bshe|her|girl|woman|crush|dating\b/i },
  { topic: /\bhe\b/i, requiresMention: /\bhe|him|guy|man|crush|dating\b/i },
  { topic: /\bdallas\b/i, requiresMention: /\bdallas\b/i },
  { topic: /\bpromotion\b/i, requiresMention: /\bpromotion|promoted|raise|title|role|job|career|dallas|move|relocat|offer\b/i },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_TOKENS.has(token));
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export function buildGroundingBundle(input: {
  situationTitle: string;
  contextSummary?: string | null;
  selectedPathTitle?: string | null;
  pathText?: string[];
}): GroundingBundle {
  const pathText = input.pathText ?? [];
  let corpus = uniqueStrings([
    input.situationTitle,
    input.contextSummary ?? "",
    input.selectedPathTitle ?? "",
    ...pathText,
  ]).join("\n");

  if (/\b(dallas|move|relocat|new city|job offer|might get a job|moved to|moving to)\b/i.test(corpus)) {
    corpus = `${corpus}\njob move work office relocate`;
  }

  if (/\b(girl|guy|crush|work|office|colleague)\b/i.test(corpus)) {
    corpus = `${corpus}\nwork office colleague`;
  }

  if (
    /\b(startup|business|launch|product|users|company|founder|cofounder|co-founder|mvp|side project)\b/i.test(
      corpus,
    )
  ) {
    corpus = `${corpus}\nbusiness launch product users mvp customers market`;
  }

  return {
    situationTitle: input.situationTitle.trim(),
    contextSummary: input.contextSummary?.trim() ?? null,
    selectedPathTitle: input.selectedPathTitle?.trim() ?? null,
    pathText,
    corpus,
    tokens: new Set(tokenize(corpus)),
  };
}

export function mentionsInventedTopic(text: string, bundle: GroundingBundle): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  return INVENTED_TOPIC_CHECKS.some(
    ({ topic, requiresMention }) =>
      topic.test(trimmed) && !requiresMention.test(bundle.corpus),
  );
}

export function scoreSourceGrounding(text: string, bundle: GroundingBundle): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return -10;
  }

  if (mentionsInventedTopic(trimmed, bundle)) {
    return -12;
  }

  let score = 0;
  const textTokens = tokenize(trimmed);

  for (const token of textTokens) {
    if (bundle.tokens.has(token)) {
      score += 2;
    }
  }

  if (bundle.selectedPathTitle && trimmed.toLowerCase().includes(bundle.selectedPathTitle.toLowerCase())) {
    score += 3;
  }

  if (bundle.situationTitle && trimmed.toLowerCase().includes(bundle.situationTitle.toLowerCase())) {
    score += 2;
  }

  if (/\b(work|job|move|home|office|offer|city|alone|friend|relationship|decision)\b/i.test(trimmed)) {
    if (/\b(work|job|move|home|office|offer|city|alone|friend|relationship|decision)\b/i.test(bundle.corpus)) {
      score += 2;
    }
  }

  return score;
}

export function isGroundedFutureText(text: string, bundle: GroundingBundle): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  if (mentionsInventedTopic(trimmed, bundle)) {
    return false;
  }

  return scoreSourceGrounding(trimmed, bundle) >= 0;
}

export function extractContextHints(contextSummary: string | null): string[] {
  if (!contextSummary?.trim()) {
    return [];
  }

  return contextSummary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const answer = line.includes("\n") ? line.split("\n").pop() : line;
      return answer ? [answer.replace(/^[^:]+:\s*/, "").trim()] : [];
    })
    .filter((hint) => hint.length > 0)
    .slice(0, 3);
}

export function buildSourceTrace(bundle: GroundingBundle): string {
  const parts = [`Situation: ${bundle.situationTitle}`];
  const hints = extractContextHints(bundle.contextSummary);

  if (hints.length > 0) {
    parts.push(`Context: ${hints.join("; ")}`);
  }

  if (bundle.selectedPathTitle) {
    parts.push(`Path: ${bundle.selectedPathTitle}`);
  }

  return parts.join(" → ");
}

export function buildGroundedWhy(
  title: string,
  bundle: GroundingBundle,
  reasoning: string | null,
): string {
  const hints = extractContextHints(bundle.contextSummary);
  const reasoningSentence = reasoning?.trim() ? reasoning.trim() : null;

  if (bundle.selectedPathTitle && hints.length > 0) {
    return `Because you described "${bundle.situationTitle}", noted "${hints[0]}", and chose ${bundle.selectedPathTitle}, ${reasoningSentence ?? "this outcome follows naturally."}`;
  }

  if (bundle.selectedPathTitle) {
    return `Because you described "${bundle.situationTitle}" and chose ${bundle.selectedPathTitle}, ${reasoningSentence ?? "this outcome follows naturally."}`;
  }

  if (reasoningSentence) {
    return reasoningSentence;
  }

  return `Based on "${bundle.situationTitle}", this outcome follows from what you shared.`;
}

export function pickGroundedSocialCircleTitle(bundle: GroundingBundle): string {
  if (/\brun(ning)?|jog(ging)?|run club|marathon\b/i.test(bundle.corpus)) {
    return "The Run Club Becomes Your Main Friend Group";
  }

  if (/\bwork|office|colleague|coworker|job\b/i.test(bundle.corpus)) {
    return "Most Of Your New Friends Come From Work";
  }

  return "Most Of Your New Friends Come From Work";
}
