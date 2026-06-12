import type { ThemeName } from "@/types/enums";

const MIN_PATH_TITLE_WORDS = 2;
const MAX_PATH_TITLE_WORDS = 5;

export type StrategyCategory =
  | "launch"
  | "validate"
  | "partner"
  | "employment"
  | "delay"
  | "relocation-accept"
  | "relocation-stay"
  | "negotiate"
  | "explore"
  | "relationship-platonic"
  | "relationship-direct"
  | "relationship-context"
  | "move-on"
  | "wait"
  | "commit"
  | "self-focus"
  | "walk-away"
  | "stable"
  | "rejection"
  | "build";

const STRATEGY_PATTERNS: Array<{ pattern: RegExp; category: StrategyCategory }> = [
  {
    pattern: /ask (her|him|them) out|express.*interest directly|create a clear moment|tell (her|him|them)/i,
    category: "relationship-direct",
  },
  {
    pattern: /outside work|off[- ]site|change.*context|spend time together outside|one-on-one outside/i,
    category: "relationship-context",
  },
  { pattern: /move on|redirect.*energy|energy elsewhere|let (this|it) go|pursue someone else/i, category: "move-on" },
  {
    pattern: /stronger signals|evidence becomes clearer|wait for.*signal|clearer sign/i,
    category: "wait",
  },
  {
    pattern: /move forward|commit|decisive|step in fully|take the leap|direct approach/i,
    category: "commit",
  },
  { pattern: /pause|gather|wait|information before|slow down|hold steady|play it safe/i, category: "wait" },
  { pattern: /decline|turn down|walk away from/i, category: "walk-away" },
  {
    pattern: /friendship|friendly|platonic|stay friends|get to know|build connection first/i,
    category: "relationship-platonic",
  },
  { pattern: /reject|rejection|face the risk/i, category: "rejection" },
  { pattern: /focus on yourself|yourself first|self[- ]focus|go your own way/i, category: "self-focus" },
  {
    pattern: /accept.*role|accept.*offer|take the job|take the opportunity|relocate|move to dallas/i,
    category: "relocation-accept",
  },
  {
    pattern: /stay in your current|stay in .* current city|current city|pass on the offer|remain where you are/i,
    category: "relocation-stay",
  },
  { pattern: /delay|postpone|hold off|wait on the decision/i, category: "delay" },
  { pattern: /negotiate|remote|hybrid|flexible arrangement|counteroffer/i, category: "negotiate" },
  {
    pattern: /explore.*alternative|different direction|another option|other opportunities/i,
    category: "explore",
  },
  {
    pattern: /launch now|ship now|go live|release now|launch window|launch after graduation/i,
    category: "launch",
  },
  { pattern: /keep building|continue building|build longer|keep working on it/i, category: "build" },
  {
    pattern: /find a (co[- ]?founder|partner)|cofounder|co-founder|business partner/i,
    category: "partner",
  },
  { pattern: /test with users|user testing|beta test|pilot with users|talk to users/i, category: "validate" },
  { pattern: /get a job first|take a job first|work first|employment first/i, category: "employment" },
  { pattern: /pause the project|put on hold|pause development|wait until graduation/i, category: "delay" },
  { pattern: /build.*relationship|closer ties/i, category: "relationship-platonic" },
  { pattern: /keep.*stable|maintain.*status|stay put/i, category: "stable" },
];

const THEME_STRATEGY: Partial<Record<ThemeName, StrategyCategory>> = {
  Courage: "commit",
  Stability: "wait",
  Connection: "relationship-platonic",
  Growth: "commit",
  Independence: "self-focus",
  Curiosity: "explore",
  Belonging: "stable",
  Creativity: "build",
  Reflection: "wait",
  Leadership: "commit",
};

const FRAGMENT_TITLE_START =
  /^(choose|rather|explore taking|spend defined|you might|you may|perhaps|ideally|look for|carrying|treat)\b/i;

export type SituationDomain = "work-crush" | "relocation" | "business" | "general";

export function detectSituationDomain(...texts: string[]): SituationDomain {
  const combined = texts.join("\n").toLowerCase();

  if (
    /\b(girl|guy|crush|dating|her|him)\b/.test(combined) &&
    /\b(work|office|colleague|coworker)\b/.test(combined)
  ) {
    return "work-crush";
  }

  if (
    /\b(startup|business|launch|product|users|company|founder|cofounder|co-founder|mvp|side project|starting a business|start a business)\b/.test(
      combined,
    )
  ) {
    return "business";
  }

  if (/\b(dallas|move|relocat|new city|new job|job offer|might get a job|moving to)\b/.test(combined)) {
    return "relocation";
  }

  return "general";
}

function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function countWords(title: string): number {
  return title.trim().split(/\s+/).filter(Boolean).length;
}

export function isValidStrategyTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) {
    return false;
  }

  if (/^Path \d+$/.test(trimmed)) {
    return true;
  }

  if (FRAGMENT_TITLE_START.test(trimmed)) {
    return false;
  }

  const wordCount = countWords(trimmed);
  if (wordCount < MIN_PATH_TITLE_WORDS || wordCount > MAX_PATH_TITLE_WORDS) {
    return false;
  }

  if (/^(the|a|an|you|your|to|and|or|but|with|from|into|that|this)\b/i.test(trimmed)) {
    return false;
  }

  return /^[A-Z]/.test(trimmed);
}

export function classifyStrategyCategory(
  description: string,
  themes: ThemeName[] = [],
): StrategyCategory | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return null;
  }

  for (const { pattern, category } of STRATEGY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return category;
    }
  }

  const primaryTheme = themes[0];
  if (primaryTheme && THEME_STRATEGY[primaryTheme]) {
    return THEME_STRATEGY[primaryTheme] ?? null;
  }

  return null;
}

function titleVariantForCategory(
  category: StrategyCategory,
  domain: SituationDomain,
  variantIndex: number,
): string {
  const variant = variantIndex % 3;

  switch (category) {
    case "launch":
      return ["Launch Now", "Ship The First Version", "Go Live Soon"][variant]!;
    case "validate":
      return ["Test With Users", "Validate Before Launch", "Run A Pilot First"][variant]!;
    case "partner":
      return ["Find A Co-Founder", "Partner With Someone", "Build With A Partner"][variant]!;
    case "employment":
      return ["Get A Job First", "Prioritize Employment", "Take Work First"][variant]!;
    case "delay":
      return domain === "business"
        ? ["Pause The Project", "Delay The Launch", "Wait Before Shipping"][variant]!
        : ["Delay The Decision", "Wait Before Deciding", "Hold Off For Now"][variant]!;
    case "relocation-accept":
      return ["Take The Job", "Make The Move", "Accept The Offer"][variant]!;
    case "relocation-stay":
      return ["Stay Where You Are", "Pass On The Offer", "Remain In Place"][variant]!;
    case "negotiate":
      return ["Negotiate The Offer", "Ask For Better Terms", "Seek A Compromise"][variant]!;
    case "explore":
      return ["Explore Other Options", "Look At Alternatives", "Test Other Paths"][variant]!;
    case "relationship-platonic":
      return domain === "work-crush"
        ? ["Friendship First", "Stay Friendly At Work", "Build Closer Ties"][variant]!
        : ["Friendship First", "Build Closer Ties", "Stay Connected"][variant]!;
    case "relationship-direct":
      return domain === "work-crush"
        ? ["Ask Her Out", "Make A Direct Move", "Create A Clear Moment"][variant]!
        : ["Direct Approach", "Make Your Move", "Take Direct Action"][variant]!;
    case "relationship-context":
      return ["Change The Context", "Meet Outside Work", "Shift The Setting"][variant]!;
    case "move-on":
      return ["Move On", "Let This Go", "Redirect Your Energy"][variant]!;
    case "wait":
      return ["Wait And Observe", "Wait For Stronger Signals", "Hold Steady For Now"][variant]!;
    case "commit":
      return ["Take The Leap", "Commit Fully", "Move Forward Now"][variant]!;
    case "self-focus":
      return ["Focus On Yourself", "Go Your Own Way", "Put Yourself First"][variant]!;
    case "walk-away":
      return ["Walk Away", "Decline The Option", "Step Back From This"][variant]!;
    case "stable":
      return ["Keep Things Stable", "Maintain The Status Quo", "Stay Put For Now"][variant]!;
    case "rejection":
      return ["Face Rejection", "Risk A No", "Accept Possible Rejection"][variant]!;
    case "build":
      return domain === "business"
        ? ["Keep Building", "Continue Building", "Build Before Launching"][variant]!
        : ["Keep Building", "Build Something New", "Keep Developing It"][variant]!;
    default:
      return "Choose A Direction";
  }
}

export function generateStrategyTitle(
  category: StrategyCategory,
  domain: SituationDomain,
  variantIndex = 0,
): string {
  const title = titleVariantForCategory(category, domain, variantIndex);
  return isValidStrategyTitle(title) ? title : toTitleCase(title);
}

export function classifyStrategyTitle(
  description: string,
  themes: ThemeName[] = [],
  index = 0,
  domain: SituationDomain = "general",
): string | null {
  const category = classifyStrategyCategory(description, themes);
  if (!category) {
    return null;
  }

  return generateStrategyTitle(category, domain, index);
}

export function formatPathTitle(
  description: string,
  themes: ThemeName[] = [],
  index = 0,
  domain: SituationDomain = "general",
): string {
  const classified = classifyStrategyTitle(description, themes, index, domain);
  if (classified && isValidStrategyTitle(classified)) {
    return classified;
  }

  return `Path ${index + 1}`;
}

export function countPathTitleWords(title: string): number {
  return countWords(title);
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export function buildPathTitleCandidates(
  description: string,
  themes: ThemeName[] = [],
  index = 0,
  domain: SituationDomain = "general",
): string[] {
  const category = classifyStrategyCategory(description, themes);
  const candidates: string[] = [];

  if (category) {
    for (let variant = 0; variant < 3; variant += 1) {
      candidates.push(generateStrategyTitle(category, domain, variant));
    }
  }

  for (const theme of themes) {
    const themeCategory = theme ? THEME_STRATEGY[theme] : null;
    if (themeCategory) {
      candidates.push(generateStrategyTitle(themeCategory, domain, index));
    }
  }

  candidates.push(formatPathTitle(description, themes, index, domain));
  candidates.push(`Path ${index + 1}`);

  return uniqueStrings(candidates).filter((candidate) => isValidStrategyTitle(candidate));
}

type PathTitleInput = {
  description: string;
  themes?: ThemeName[];
};

function isSelfHelpTitle(title: string): boolean {
  return /^(focus on yourself|go your own way|push forward|choose growth|stretch yourself|stand alone)$/i.test(
    title,
  );
}

function isTitleAllowedForDomain(title: string, domain: SituationDomain): boolean {
  if (domain === "general") {
    return isValidStrategyTitle(title);
  }

  if (isSelfHelpTitle(title)) {
    return false;
  }

  return isValidStrategyTitle(title);
}

export function assignUniquePathTitles(
  paths: PathTitleInput[],
  situationTitle = "",
): string[] {
  const domain = detectSituationDomain(
    situationTitle,
    ...paths.map((path) => path.description),
  );
  const usedTitles = new Set<string>();
  const usedCategories = new Set<StrategyCategory>();

  return paths.map((path, index) => {
    const category = classifyStrategyCategory(path.description, path.themes ?? []);
    const candidates = buildPathTitleCandidates(path.description, path.themes ?? [], index, domain);

    if (category) {
      for (let variant = 0; variant < 3; variant += 1) {
        const strategyTitle = generateStrategyTitle(category, domain, variant);
        if (
          isTitleAllowedForDomain(strategyTitle, domain) &&
          !usedTitles.has(strategyTitle) &&
          !usedCategories.has(category)
        ) {
          usedTitles.add(strategyTitle);
          usedCategories.add(category);
          return strategyTitle;
        }
      }
    }

    for (const candidate of candidates) {
      const candidateCategory = classifyStrategyCategory(path.description, path.themes ?? []);
      if (
        isTitleAllowedForDomain(candidate, domain) &&
        !usedTitles.has(candidate) &&
        (!candidateCategory || !usedCategories.has(candidateCategory))
      ) {
        usedTitles.add(candidate);
        if (candidateCategory) {
          usedCategories.add(candidateCategory);
        }
        return candidate;
      }
    }

    for (let variant = 0; variant < 6; variant += 1) {
      const fallbackCategory = classifyStrategyCategory(path.description, path.themes ?? []) ??
        THEME_STRATEGY[path.themes?.[0] ?? "Reflection"] ??
        "explore";
      const fallbackTitle = generateStrategyTitle(fallbackCategory, domain, index + variant);
      if (isTitleAllowedForDomain(fallbackTitle, domain) && !usedTitles.has(fallbackTitle)) {
        usedTitles.add(fallbackTitle);
        usedCategories.add(fallbackCategory);
        return fallbackTitle;
      }
    }

    const numberedTitle = `Path ${index + 1}`;
    usedTitles.add(numberedTitle);
    return numberedTitle;
  });
}
