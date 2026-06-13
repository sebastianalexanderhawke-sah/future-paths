import type { PathTextFieldTrace } from "@/lib/path-text-transformation-trace";
import {
  buildPathTextFieldLabel,
  buildPathTextTransformationTrace,
  type PathTextStageCapture,
} from "@/lib/path-text-transformation-trace";

export type { PathTextStageCapture } from "@/lib/path-text-transformation-trace";

const REFLECTIVE_PATH_PATTERNS: RegExp[] = [
  /\bclarity\b/i,
  /\breflect(ion|ive|ing| further)?\b/i,
  /\bobserve\b/i,
  /\blearn(ing)? more\b/i,
  /\bunderstand(ing)? (yourself|your feelings|more|better)\b/i,
  /\bself[- ]awareness\b/i,
  /\bgrowth journey\b/i,
  /\bexplore (possibilities|options|more)\b/i,
  /\bbuild understanding\b/i,
  /\bgain (more )?(clarity|insight|perspective)\b/i,
  /\bthink(ing)? (about|through)\b/i,
  /\bprocess(ing)? (your|the|feelings)\b/i,
  /\bbecome someone who\b/i,
  /\bbecoming someone who\b/i,
  /\binternal (shift|work|change)\b/i,
  /\bemotional (clarity|processing)\b/i,
  /\bnotice patterns\b/i,
  /\bspace to notice\b/i,
  /\bdeliberate (effort|reflection)\b/i,
  /\bwho you (are|want to be)\b/i,
  /\bgradually reveal\b/i,
  /\bmay gradually\b/i,
  /\bbetter understand\b/i,
];

const REFLECTIVE_ACTION_START =
  /^(gain|observe|reflect|learn|understand|explore|process|consider|think about|work on|focus on|notice|gather|build understanding)\b/i;

const INCOMPLETE_ENDINGS =
  /\b(the|a|an|on|in|at|to|for|with|that|which|and|or|who|if|when|whether|your|you|feels|may|might|could|would|will|become|reveals?|shows?|whether|about|into|from|through|without|this|that)\s*[.!?]?$/i;

const MAX_PRESERVE_LENGTH = 250;

const IMPERATIVE_VERB_START =
  /^(invite|ask|tell|say|choose|accept|decline|wait|move|stay|take|build|focus|keep|try|test|go|walk|face|negotiate|explore|push|hold|play|think|change|direct|make|create|start|stop|let|give|find|share|spend|reach|offer|plan|commit|defer|turn|reframe|prioritize|redirect|commit)\b/i;

const SUBJECT_PATTERN =
  /\b(you|she|he|they|it|we|someone|people|work|the|a|an|your|her|his|their|coworkers?|friends?|family|employer|role|offer|job|move|relationship|friendship|situation|connection|interest|message|timing|path|decision)\b/i;

const VERB_PATTERN =
  /\b(is|are|was|were|may|might|will|would|can|could|feel|feels|make|makes|leave|leaves|invite|invites|become|becomes|share|shares|pick|picks|signal|signals|start|starts|keep|keeps|create|creates|go|goes|get|gets|move|moves|turn|turns|help|helps|need|needs|want|wants|allow|allows|offer|offers|ask|asks|say|says|see|sees|learn|learns|build|builds|grow|grows|show|shows|bring|brings|take|takes|give|gives|find|finds|lose|loses|gain|gains|stay|stays|remain|remains|disappear|disappears|fade|fades|hit|hits|receive|receives|accept|accepts|decline|declines|notice|notices|assume|assumes|clear|force|forces|unanswered|pick up|decline|declines|overhear|overhears|text|texts|date|dates|plan|plans|renew|renews|relocate|relocates|negotiate|negotiates|commit|commits|defer|defers|explore|explores|redirect|redirects|spend|spends|meet|meets|talk|talks|work|works|feel|feels|read|reads|look|looks|seem|seems|assume|assumes|making|leaving|leaving|forcing|creating|building|inviting|asking|choosing|taking|staying|moving|waiting|holding|trying|testing|going|walking|facing|offering|planning|sharing|picking|signaling|starting|keeping|turning|helping|needing|wanting|allowing|saying|seeing|learning|growing|showing|bringing|giving|finding|losing|gaining|remaining|disappearing|fading|hitting|receiving|accepting|declining|noticing|clearing|forcing)\b/i;

const OUTCOME_REWRITES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /gain clarity/i, replacement: "You get a clear answer sooner." },
  { pattern: /clarity may come/i, replacement: "The situation becomes easier to read." },
  { pattern: /better understand/i, replacement: "You see where things stand." },
  { pattern: /learn more about her/i, replacement: "You learn more about her naturally." },
  { pattern: /learn more/i, replacement: "You pick up details that change what you do next." },
  { pattern: /reflect further/i, replacement: "The situation stays unresolved for longer." },
  { pattern: /space to notice/i, replacement: "The answer becomes obvious within weeks." },
  { pattern: /discover capacities/i, replacement: "You discover what you can handle in practice." },
  { pattern: /progress may feel uneven/i, replacement: "Progress comes in uneven stretches." },
  { pattern: /momentum may slow/i, replacement: "Momentum slows while others move ahead." },
  {
    pattern: /door on alternative directions may close/i,
    replacement: "Other options become harder to reach.",
  },
  { pattern: /waiting can become its own habit/i, replacement: "Waiting becomes its own pattern." },
  { pattern: /relationship begins/i, replacement: "A relationship begins." },
  { pattern: /friendship grows/i, replacement: "The friendship grows stronger." },
  { pattern: /someone else enters/i, replacement: "Someone else enters the picture." },
  { pattern: /workplace becomes awkward/i, replacement: "Work feels awkward for a while." },
  { pattern: /she may not share/i, replacement: "She may not share the same interest." },
  { pattern: /she loses interest/i, replacement: "She loses interest." },
  { pattern: /you move on/i, replacement: "You move on." },
];

const WEAK_PATH_BULLET_PATTERNS: RegExp[] = [
  /new information changes what happens next/i,
  /progress becomes easier to see/i,
  /a preferred outcome becomes more likely/i,
  /creates a visible upside/i,
  /closes off at least one alternative/i,
  /the tradeoff becomes harder to ignore/i,
  /a downside may show up later/i,
  /changes how the next few months unfold/i,
  /creates a visible shift in daily life/i,
  /you discover what you can handle in practice/i,
  /progress comes in uneven stretches/i,
  /the situation becomes easier to read/i,
  /you see where things stand/i,
  /you pick up details that change what you do next/i,
];

const FUTURE_YOU_BY_TITLE: Record<string, string> = {
  "Direct Approach": "More comfortable taking emotional risks and acting on what matters.",
  "Ask Her Out": "More willing to create a clear moment and accept the answer.",
  "Change The Context": "More confident spending time together outside the usual setting.",
  "Move On": "More willing to redirect energy when a path is not working.",
  "Wait For Stronger Signals": "More patient about acting only when evidence is clearer.",
  "Take The Leap": "More willing to move before every detail feels settled.",
  "Bold Move": "More confident making a visible choice and standing by it.",
  "Friendship First": "More patient and confident in building relationships.",
  "Build Closer Ties": "More skilled at deepening trust before pushing for more.",
  "Stay Connected": "More steady at maintaining connection without forcing a label.",
  "Wait And Observe": "More deliberate before acting on uncertainty.",
  "Play It Safe": "More cautious about moving before the picture is clearer.",
  "Hold Steady": "More comfortable letting time reveal what is real.",
  "Think It Through": "More willing to pause until the next step feels grounded.",
  "Focus On Yourself": "More centered on your own direction instead of waiting on signals.",
  "Go Your Own Way": "More independent in how you define what comes next.",
  "Stand Alone": "More self-reliant when the outcome is uncertain.",
  "Walk Away": "More willing to close a door when the fit is not there.",
  "Face Rejection": "More resilient if the answer is no.",
  "Take The Job": "More committed once you decide to step in fully.",
  "Stay Where You Are": "More grounded in protecting what already works.",
  "Delay The Decision": "More patient about timing before making a big change.",
  "Negotiate The Offer": "More flexible about finding a workable middle ground.",
  "Find A Co-Founder": "More willing to share the build with a complementary partner.",
  "Find A Partner": "More willing to share the build with a complementary partner.",
  "Explore Other Opportunities": "More open to routes you had not originally considered.",
  "Take The Opportunity": "More committed once you decide to step in fully.",
  "Delay The Move": "More patient about timing before making a big change.",
  "Negotiate Terms": "More flexible about finding a workable middle ground.",
  "Explore Alternatives": "More open to routes you had not originally considered.",
  "Keep Things Stable": "More grounded in protecting what already works.",
  "Push Forward": "More driven to convert momentum into a concrete result.",
  "Choose Growth": "More oriented toward stretching into a bigger version of life.",
  "Test The Waters": "More comfortable trying a smaller step before going all in.",
  "Try Something New": "More open to a path that breaks from the current pattern.",
};

const FUTURE_YOU_BY_THEME: Partial<Record<string, string>> = {
  Courage: "More comfortable taking risks when the moment asks for action.",
  Stability: "More patient about waiting before you commit.",
  Connection: "More confident investing in relationships that matter.",
  Growth: "More willing to stretch into a bigger next chapter.",
  Independence: "More self-directed about what you want next.",
  Curiosity: "More open to discovering where an unfamiliar path leads.",
  Belonging: "More rooted in the relationships that anchor you.",
  Creativity: "More expressive about shaping life on your own terms.",
  Reflection: "More careful about choosing a step that fits the full picture.",
  Leadership: "More willing to set direction instead of waiting for it.",
};

const SUMMARY_BY_TITLE: Partial<Record<string, string>> = {
  "Direct Approach":
    "You make your interest or intention clear and invite a concrete next step.",
  "Ask Her Out": "You create a clear moment and see what happens.",
  "Change The Context": "You spend time together outside work and see what develops.",
  "Move On": "You redirect your energy elsewhere instead of waiting on this connection.",
  "Wait For Stronger Signals":
    "You act only if evidence becomes clearer and the moment feels right.",
  "Friendship First":
    "You build a friendship before expressing romantic interest.",
  "Wait And Observe":
    "You hold back for now and watch how the situation unfolds before acting.",
  "Focus On Yourself":
    "You redirect energy toward your own life instead of pushing the situation forward.",
  "Walk Away": "You step back from this option and leave room for a different direction.",
  "Take The Job": "You accept the role and relocate as planned.",
  "Stay Where You Are": "You turn down or defer the move and keep your current life in place.",
  "Delay The Decision": "You postpone the decision until more information or timing feels right.",
  "Negotiate The Offer": "You push for better terms before committing to the move.",
  "Explore Other Opportunities": "You look at other roles or cities before deciding on this one.",
  "Take The Opportunity":
    "You commit to the opportunity and move forward as if it is your next chapter.",
  "Delay The Move":
    "You postpone the decision until more information or timing feels right.",
};

function capitalize(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function extractFirstSentence(text: string): string {
  const trimmed = text.trim().replace(/…/g, "");
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^[^.!?]+[.!?]/);
  return (match ? match[0] : trimmed).trim();
}

export function isReflectivePathContent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  if (WEAK_PATH_BULLET_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (REFLECTIVE_ACTION_START.test(trimmed)) {
    return true;
  }

  return REFLECTIVE_PATH_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes("…")) {
    return false;
  }

  if (/[.!?]$/.test(trimmed)) {
    return !INCOMPLETE_ENDINGS.test(trimmed.replace(/[.!?]+$/, ""));
  }

  return trimmed.split(/\s+/).length >= 8 && !INCOMPLETE_ENDINGS.test(trimmed);
}

function hasSubjectAndVerb(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  if (IMPERATIVE_VERB_START.test(trimmed)) {
    return true;
  }

  return SUBJECT_PATTERN.test(trimmed) && VERB_PATTERN.test(trimmed);
}

export function shouldPreservePathSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_PRESERVE_LENGTH || trimmed.includes("…")) {
    return false;
  }

  if (isReflectivePathContent(trimmed)) {
    return false;
  }

  const normalized = ensureTerminalPunctuation(trimmed);
  if (!isCompleteSentence(normalized)) {
    return false;
  }

  return hasSubjectAndVerb(normalized);
}

function preservePathSentence(text: string, stages?: PathTextStageCapture): string {
  const preserved = ensureTerminalPunctuation(text.trim());
  if (stages) {
    stages.afterRefinement = preserved;
    stages.afterFormatting = preserved;
    stages.preservedBypass = true;
  }
  return preserved;
}

export function summarizeToCompleteSentence(
  text: string,
  maxLength = 180,
  stages?: PathTextStageCapture,
): string {
  const trimmed = text.trim().replace(/…/g, "");
  if (!trimmed) {
    if (stages) {
      stages.afterRefinement = "";
      stages.afterFormatting = "";
    }
    return "";
  }

  if (shouldPreservePathSentence(trimmed)) {
    return preservePathSentence(trimmed, stages);
  }

  let sentence = extractFirstSentence(trimmed);
  sentence = sentence.replace(/[.!?]+$/, "").trim();

  if (isCompleteSentence(`${sentence}.`)) {
    const complete = ensureTerminalPunctuation(sentence);
    if (stages) {
      stages.afterRefinement = complete;
      stages.afterFormatting = complete;
    }
    return complete;
  }

  const words = sentence.split(/\s+/).filter(Boolean);
  while (words.length > 4 && INCOMPLETE_ENDINGS.test(words.join(" "))) {
    words.pop();
  }

  let core = words.join(" ").trim();
  if (!core) {
    core = trimmed.split(/\s+/).slice(0, 10).join(" ");
  }

  if (stages) {
    stages.afterRefinement = ensureTerminalPunctuation(capitalize(core));
  }

  let formatted = core;
  if (/relationship|interest|crush|dating|friend|workplace|colleague/i.test(core)) {
    formatted = `${capitalize(core)} and see how she responds`;
  } else if (/job|offer|move|relocate|career|role|city|dallas/i.test(core)) {
    formatted = `${capitalize(core)} and commit to the next step`;
  } else if (/business|startup|launch|company/i.test(core)) {
    formatted = `${capitalize(core)} and test what traction follows`;
  } else {
    if (core.length > maxLength) {
      core = core.split(/\s+/).slice(0, 12).join(" ");
    }

    formatted = `${capitalize(core)} and see what follows`;
  }

  if (stages) {
    stages.afterFormatting = ensureTerminalPunctuation(formatted).replace(/[.!?]+$/, "");
  }

  return ensureTerminalPunctuation(formatted);
}

function rewriteOutcome(text: string, stages?: PathTextStageCapture): string {
  const trimmed = text.trim();
  if (!trimmed) {
    if (stages) {
      stages.afterRefinement = "";
      stages.afterFormatting = "";
    }
    return "";
  }

  if (shouldPreservePathSentence(trimmed)) {
    return preservePathSentence(trimmed, stages);
  }

  for (const { pattern, replacement } of OUTCOME_REWRITES) {
    if (pattern.test(trimmed)) {
      if (stages) {
        stages.afterRefinement = replacement;
        stages.afterFormatting = ensureTerminalPunctuation(replacement).replace(/[.!?]+$/, "");
      }
      return ensureTerminalPunctuation(replacement);
    }
  }

  let outcome = extractFirstSentence(trimmed)
    .replace(/^you may (find|discover|feel|notice|gain|build|become)\s+/i, "")
    .replace(/^the /i, "The ")
    .replace(/^a /i, "A ")
    .trim();

  outcome = outcome.replace(/[.!?]+$/, "").trim();

  if (stages) {
    stages.afterRefinement = outcome;
  }

  if (isReflectivePathContent(outcome)) {
    if (stages) {
      stages.afterFormatting = "";
    }
    return "";
  }

  if (!isCompleteSentence(`${outcome}.`)) {
    return summarizeToCompleteSentence(outcome, 90, stages);
  }

  const final = ensureTerminalPunctuation(capitalize(outcome));
  if (stages) {
    stages.afterFormatting = final.replace(/[.!?]+$/, "");
  }
  return final;
}

function normalizeOutcomeKey(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

export function formatPathOutcomes(benefits: string[], consequences: string[]): string[] {
  const seen = new Set<string>();
  const outcomes: string[] = [];

  for (const candidate of [...benefits, ...consequences]) {
    const outcome = rewriteOutcome(candidate);
    const key = normalizeOutcomeKey(outcome);
    if (!outcome || !key || seen.has(key) || isReflectivePathContent(outcome)) {
      continue;
    }

    seen.add(key);
    outcomes.push(outcome);

    if (outcomes.length >= 5) {
      break;
    }
  }

  return outcomes;
}

function formatPathBulletList(items: string[], title: string, fallbackPool: string[]): string[] {
  const seen = new Set<string>();
  const bullets: string[] = [];

  for (const candidate of items) {
    const bullet = rewriteOutcome(candidate);
    const key = normalizeOutcomeKey(bullet);
    if (!bullet || !key || seen.has(key) || isReflectivePathContent(bullet)) {
      continue;
    }

    seen.add(key);
    bullets.push(bullet);

    if (bullets.length >= 5) {
      break;
    }
  }

  if (bullets.length >= 3) {
    return bullets.slice(0, 5);
  }

  for (const candidate of fallbackPool) {
    const bullet = rewriteOutcome(candidate);
    const key = normalizeOutcomeKey(bullet);
    if (!bullet || !key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    bullets.push(bullet);

    if (bullets.length >= 3) {
      break;
    }
  }

  return bullets.slice(0, 5);
}

const BENEFIT_FALLBACKS_BY_TITLE: Partial<Record<string, string[]>> = {
  "Direct Approach": [
    "You get an answer quickly.",
    "A relationship could begin sooner.",
    "You stop wondering what might happen.",
  ],
  "Ask Her Out": [
    "You get a clear answer quickly.",
    "A date or relationship could begin soon.",
    "You stop carrying the uncertainty alone.",
  ],
  "Friendship First": [
    "The friendship becomes stronger.",
    "She relaxes more whenever you talk.",
    "You pick up details about her life naturally.",
  ],
  "Change The Context": [
    "You spend time together without workplace pressure.",
    "The dynamic feels more personal and relaxed.",
    "You see how she acts outside the office.",
  ],
  "Move On": [
    "Your energy goes toward options that fit better.",
    "Work stays simpler without romantic tension.",
    "You regain focus on your own priorities.",
  ],
  "Wait For Stronger Signals": [
    "You avoid acting before the moment is right.",
    "You keep the connection low risk for now.",
    "More evidence appears before you commit.",
  ],
  "Wait And Observe": [
    "You avoid a premature move.",
    "More evidence appears before you commit.",
    "The dynamic stays low risk for now.",
  ],
  "Focus On Yourself": [
    "Your own goals get more attention.",
    "You build momentum in other parts of life.",
    "The pressure to force an outcome drops.",
  ],
  "Take The Job": [
    "The role or move starts sooner.",
    "Career momentum builds in the new setting.",
    "You stop debating and start living the choice.",
  ],
  "Stay Where You Are": [
    "You keep current stability for now.",
    "You avoid relocation risk.",
    "Your existing network stays intact.",
  ],
  "Delay The Decision": [
    "You keep current stability for now.",
    "You have more time to prepare.",
    "The decision can wait until timing improves.",
  ],
  "Negotiate The Offer": [
    "You may get better pay or flexibility.",
    "You keep the opportunity without accepting every term.",
    "You reduce the downside of a full move.",
  ],
  "Explore Other Opportunities": [
    "You compare this offer against other options.",
    "You avoid committing before seeing alternatives.",
    "You may find a better fit elsewhere.",
  ],
  "Take The Opportunity": [
    "The role or move starts sooner.",
    "Career momentum builds in the new setting.",
    "You stop debating and start living the choice.",
  ],
  "Delay The Move": [
    "You keep current stability for now.",
    "You have more time to prepare.",
    "The decision can wait until timing improves.",
  ],
};

const CONSEQUENCE_FALLBACKS_BY_TITLE: Partial<Record<string, string[]>> = {
  "Direct Approach": [
    "She may not feel the same way.",
    "Work may feel awkward temporarily.",
    "The timing may not be right.",
  ],
  "Ask Her Out": [
    "She may say no.",
    "Work may feel awkward afterward.",
    "The friendship dynamic may change.",
  ],
  "Friendship First": [
    "She may only see you as a friend.",
    "Someone else may make a move first.",
    "The situation may remain ambiguous for months.",
  ],
  "Change The Context": [
    "She may decline outside-work plans.",
    "Coworkers may notice the shift.",
    "The moment may still not create clarity.",
  ],
  "Move On": [
    "You may never know how she felt.",
    "The connection may fade entirely.",
    "Regret may surface if signals were missed.",
  ],
  "Wait For Stronger Signals": [
    "The opportunity may pass.",
    "Someone else may move first.",
    "Waiting may become a habit.",
  ],
  "Wait And Observe": [
    "The opportunity may pass.",
    "Interest may fade on either side.",
    "Waiting may become a habit.",
  ],
  "Focus On Yourself": [
    "The connection may fade without effort.",
    "She may assume you are not interested.",
    "The window may close while you wait.",
  ],
  "Take The Job": [
    "Homesickness may hit after the move.",
    "The role may not fit as expected.",
    "Old ties may weaken faster than planned.",
  ],
  "Stay Where You Are": [
    "The opportunity may disappear.",
    "Momentum may shift elsewhere.",
    "You may wonder what would have happened.",
  ],
  "Delay The Decision": [
    "The opportunity may disappear.",
    "Momentum may shift elsewhere.",
    "The delay may become permanent indecision.",
  ],
  "Negotiate The Offer": [
    "The employer may withdraw the offer.",
    "Negotiation may delay the start date.",
    "You may still need to move on worse terms.",
  ],
  "Explore Other Opportunities": [
    "This offer may pass while you search.",
    "Comparison can slow a clear decision.",
    "You may end up with no strong option.",
  ],
  "Take The Opportunity": [
    "Homesickness may hit after the move.",
    "The role may not fit as expected.",
    "Old ties may weaken faster than planned.",
  ],
  "Delay The Move": [
    "The opportunity may disappear.",
    "Momentum may shift elsewhere.",
    "The delay may become permanent indecision.",
  ],
};

export function formatPathBenefits(benefits: string[], title: string): string[] {
  return formatPathBulletList(
    benefits,
    title,
    BENEFIT_FALLBACKS_BY_TITLE[title] ?? [
      "You gain a concrete upside from this choice.",
      "The best-case outcome becomes more reachable.",
      "You move closer to the result you want.",
    ],
  );
}

export function formatPathConsequences(consequences: string[], title: string): string[] {
  return formatPathBulletList(
    consequences,
    title,
    CONSEQUENCE_FALLBACKS_BY_TITLE[title] ?? [
      "You risk an outcome you would rather avoid.",
      "A downside may show up sooner than expected.",
      "This path may close off an alternative you wanted.",
    ],
  );
}

export function compressCurrentUnderstanding(text: string): string {
  const sentence = summarizeToCompleteSentence(text, 140);
  if (sentence && !isReflectivePathContent(sentence)) {
    return sentence;
  }

  return "You are weighing a decision with real tradeoffs ahead.";
}

export function formatPathSummary(
  description: string,
  benefits: string[],
  title: string,
): string {
  const trimmedDescription = description.trim();
  if (shouldPreservePathSentence(trimmedDescription)) {
    return preservePathSentence(trimmedDescription);
  }

  if (SUMMARY_BY_TITLE[title]) {
    return SUMMARY_BY_TITLE[title]!;
  }

  const sentences = splitSentences(description);
  if (sentences.length > 1) {
    const summary = summarizeToCompleteSentence(sentences.slice(1).join(" "));
    if (!isReflectivePathContent(summary)) {
      return summary;
    }
  }

  const descriptionSummary = summarizeToCompleteSentence(description);
  if (!isReflectivePathContent(descriptionSummary)) {
    return descriptionSummary;
  }

  for (const benefit of benefits) {
    const benefitSummary = summarizeToCompleteSentence(benefit);
    if (!isReflectivePathContent(benefitSummary)) {
      return benefitSummary;
    }
  }

  return SUMMARY_BY_TITLE[title] ?? `This path follows a ${title.toLowerCase()} strategy.`;
}

export function formatPathFutureYou(
  title: string,
  futureShift: string,
  themes: string[] = [],
): string {
  const trimmedFutureShift = futureShift.trim();
  if (shouldPreservePathSentence(trimmedFutureShift)) {
    return preservePathSentence(trimmedFutureShift);
  }

  if (FUTURE_YOU_BY_TITLE[title]) {
    return FUTURE_YOU_BY_TITLE[title]!;
  }

  let sentence = summarizeToCompleteSentence(
    futureShift
      .replace(/^you may become someone who\s+/i, "")
      .replace(/^you may become\s+/i, "You become ")
      .replace(/^you may feel\s+/i, "You feel "),
    140,
  );

  if (!isReflectivePathContent(sentence) && isCompleteSentence(sentence)) {
    return sentence;
  }

  const theme = themes[0];
  if (theme && FUTURE_YOU_BY_THEME[theme]) {
    return FUTURE_YOU_BY_THEME[theme]!;
  }

  return "More decisive about what you want and willing to live with the result.";
}

export function ensureMinimumOutcomes(
  outcomes: string[],
  title: string,
  benefits: string[],
  consequences: string[],
): string[] {
  if (outcomes.length >= 3) {
    return outcomes.slice(0, 5);
  }

  const fallbackPool = [
    ...benefits,
    ...consequences,
    `${title} creates a visible shift in daily life.`,
    `${title} closes off at least one alternative for now.`,
    `${title} changes how the next few months unfold.`,
  ];

  const merged = [...outcomes];
  for (const candidate of fallbackPool) {
    const outcome = rewriteOutcome(candidate);
    if (!outcome || merged.some((item) => normalizeOutcomeKey(item) === normalizeOutcomeKey(outcome))) {
      continue;
    }

    merged.push(outcome);
    if (merged.length >= 3) {
      break;
    }
  }

  return merged.slice(0, 5);
}

function traceTransformText(
  original: string,
  transform: (text: string, stages?: PathTextStageCapture) => string,
): { final: string; trace: ReturnType<typeof buildPathTextTransformationTrace> } {
  const stages: PathTextStageCapture = {
    afterRefinement: "",
    afterFormatting: "",
  };
  const final = transform(original, stages);

  return {
    final,
    trace: buildPathTextTransformationTrace(
      original,
      stages.afterRefinement,
      stages.afterFormatting,
      final,
      stages.preservedBypass === true,
    ),
  };
}

function formatPathBulletListWithTrace(
  items: string[],
  fallbackPool: string[],
  field: "benefit" | "consequence",
): { bullets: string[]; traces: PathTextFieldTrace[] } {
  const seen = new Set<string>();
  const bullets: string[] = [];
  const traces: PathTextFieldTrace[] = [];

  const pushCandidate = (original: string) => {
    const { final, trace } = traceTransformText(original, rewriteOutcome);
    const key = normalizeOutcomeKey(final);
    if (!final || !key || seen.has(key) || isReflectivePathContent(final)) {
      return false;
    }

    seen.add(key);
    bullets.push(final);
    traces.push({
      field,
      index: traces.length,
      label: buildPathTextFieldLabel(field, traces.length),
      trace,
    });
    return true;
  };

  for (const candidate of items) {
    pushCandidate(candidate);
    if (bullets.length >= 5) {
      break;
    }
  }

  if (bullets.length >= 3) {
    return { bullets: bullets.slice(0, 5), traces: traces.slice(0, 5) };
  }

  for (const candidate of fallbackPool) {
    pushCandidate(candidate);
    if (bullets.length >= 3) {
      break;
    }
  }

  return { bullets: bullets.slice(0, 5), traces: traces.slice(0, 5) };
}

export function formatPathBenefitsWithTrace(
  benefits: string[],
  title: string,
): { bullets: string[]; traces: PathTextFieldTrace[] } {
  return formatPathBulletListWithTrace(
    benefits,
    BENEFIT_FALLBACKS_BY_TITLE[title] ?? [
      "You gain a concrete upside from this choice.",
      "The best-case outcome becomes more reachable.",
      "You move closer to the result you want.",
    ],
    "benefit",
  );
}

export function formatPathConsequencesWithTrace(
  consequences: string[],
  title: string,
): { bullets: string[]; traces: PathTextFieldTrace[] } {
  return formatPathBulletListWithTrace(
    consequences,
    CONSEQUENCE_FALLBACKS_BY_TITLE[title] ?? [
      "You risk an outcome you would rather avoid.",
      "A downside may show up sooner than expected.",
      "This path may close off an alternative you wanted.",
    ],
    "consequence",
  );
}

export function formatPathSummaryWithTrace(
  description: string,
  benefits: string[],
  title: string,
): { summary: string; trace: ReturnType<typeof buildPathTextTransformationTrace> } {
  const original = description.trim();

  if (shouldPreservePathSentence(original)) {
    const summary = preservePathSentence(original);
    return {
      summary,
      trace: buildPathTextTransformationTrace(original, summary, summary, summary, true),
    };
  }

  if (SUMMARY_BY_TITLE[title]) {
    const final = SUMMARY_BY_TITLE[title]!;
    return {
      summary: final,
      trace: buildPathTextTransformationTrace(original, title, final, final),
    };
  }

  const sentences = splitSentences(description);
  if (sentences.length > 1) {
    const candidate = sentences.slice(1).join(" ");
    const { final, trace } = traceTransformText(candidate, (text, stages) =>
      summarizeToCompleteSentence(text, 180, stages),
    );
    if (!isReflectivePathContent(final)) {
      return { summary: final, trace };
    }
  }

  const descriptionResult = traceTransformText(description, (text, stages) =>
    summarizeToCompleteSentence(text, 180, stages),
  );
  if (!isReflectivePathContent(descriptionResult.final)) {
    return { summary: descriptionResult.final, trace: descriptionResult.trace };
  }

  for (const benefit of benefits) {
    const benefitResult = traceTransformText(benefit, (text, stages) =>
      summarizeToCompleteSentence(text, 180, stages),
    );
    if (!isReflectivePathContent(benefitResult.final)) {
      return { summary: benefitResult.final, trace: benefitResult.trace };
    }
  }

  const final = SUMMARY_BY_TITLE[title] ?? `This path follows a ${title.toLowerCase()} strategy.`;
  return {
    summary: final,
    trace: buildPathTextTransformationTrace(original, title, final, final),
  };
}

export function formatPathFutureYouWithTrace(
  title: string,
  futureShift: string,
  themes: string[] = [],
): { futureYou: string; trace: ReturnType<typeof buildPathTextTransformationTrace> } {
  const original = futureShift.trim();

  if (shouldPreservePathSentence(original)) {
    const futureYou = preservePathSentence(original);
    return {
      futureYou,
      trace: buildPathTextTransformationTrace(original, futureYou, futureYou, futureYou, true),
    };
  }

  if (FUTURE_YOU_BY_TITLE[title]) {
    const final = FUTURE_YOU_BY_TITLE[title]!;
    return {
      futureYou: final,
      trace: buildPathTextTransformationTrace(original, title, final, final),
    };
  }

  const refined = futureShift
    .replace(/^you may become someone who\s+/i, "")
    .replace(/^you may become\s+/i, "You become ")
    .replace(/^you may feel\s+/i, "You feel ");
  const sentenceResult = traceTransformText(refined, (text, stages) =>
    summarizeToCompleteSentence(text, 140, stages),
  );

  if (
    !isReflectivePathContent(sentenceResult.final) &&
    isCompleteSentence(sentenceResult.final)
  ) {
    return { futureYou: sentenceResult.final, trace: sentenceResult.trace };
  }

  const theme = themes[0];
  if (theme && FUTURE_YOU_BY_THEME[theme]) {
    const final = FUTURE_YOU_BY_THEME[theme]!;
    return {
      futureYou: final,
      trace: buildPathTextTransformationTrace(original, theme, final, final),
    };
  }

  const final = "More decisive about what you want and willing to live with the result.";
  return {
    futureYou: final,
    trace: buildPathTextTransformationTrace(original, "default-fallback", final, final),
  };
}
