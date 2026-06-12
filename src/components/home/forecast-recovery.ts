import type { ScannableFuture } from "@/components/home/output-refinement";
import type { GroundingBundle } from "@/components/home/forecast-grounding";
import {
  buildGroundedWhy,
  buildSourceTrace,
  isGroundedFutureText,
  mentionsInventedTopic,
} from "@/components/home/forecast-grounding";

export type ForecastRecoveryInput = {
  situationTitle: string;
  contextSummary?: string | null;
  selectedPathTitle?: string | null;
  reasoningSources: string[];
};

const RECOVERY_SURVIVAL_THRESHOLD = 3;
const RECOVERY_TITLE_REWRITES: Array<{ pattern: RegExp; title: string }> = [
  {
    pattern: /early user feedback changes|feedback changes the product|feedback changes direction/i,
    title: "Early Feedback Changes The Product",
  },
  {
    pattern: /feedback changes|user feedback|changes the direction/i,
    title: "The MVP Solves A Different Problem Than Expected",
  },
  { pattern: /market insight|gain market insight|market validation/i, title: "Early Users Reject The Original Idea" },
  {
    pattern: /build stronger understanding|validation creates learning|understanding of the market/i,
    title: "The MVP Targets A Different Audience",
  },
  {
    pattern: /community engagement increases|first users arrive|early traction/i,
    title: "Your First 100 Users Arrive Faster Than Expected",
  },
  { pattern: /first 10 users|ten users|initial users/i, title: "The First 10 Users Arrive" },
  { pattern: /launch slips|delayed launch|launch delay/i, title: "Launch Slips By Several Months" },
  { pattern: /competitor launches|someone else launches first/i, title: "A Competitor Launches First" },
  { pattern: /wrong audience|unexpected audience/i, title: "The Wrong Audience Loves It" },
  {
    pattern: /early user becomes|biggest advocate|power user/i,
    title: "An Early User Becomes Your Biggest Advocate",
  },
  { pattern: /job offer delays|take a job first|employment delays launch/i, title: "A Job Offer Delays The Launch" },
  { pattern: /side project|nights and weekends only/i, title: "The Business Becomes A Side Project" },
  { pattern: /graduation creates|more time after graduation/i, title: "Graduation Creates More Time Than Expected" },
  { pattern: /early user wants to help|co-build|help build it/i, title: "An Early User Wants To Help Build It" },
  { pattern: /building stops feeling fun|motivation fades/i, title: "Building Stops Feeling Fun" },
  { pattern: /homesickness|loneliness after move/i, title: "Homesickness Hits After The Initial Excitement Fades" },
  { pattern: /promotion|career growth/i, title: "You Receive A Promotion Within The First Year" },
  { pattern: /social circle|new friends/i, title: "Most Of Your New Friends Come From Work" },
  { pattern: /she starts texting|outside work/i, title: "She Starts Texting You Outside Work" },
  { pattern: /stays friendly|nothing changes/i, title: "You Keep Talking Every Week But Nothing Changes" },
];

const PROCESS_LIKE_PATTERNS: RegExp[] = [
  /\bfeedback changes\b/i,
  /\bvalidation creates\b/i,
  /\bgain (market )?insight\b/i,
  /\bbuild(s|ing)? (stronger )?understanding\b/i,
  /\bcommunity engagement\b/i,
  /\blearning increases\b/i,
  /\bdirection shifts\b/i,
  /\bprocess\b/i,
  /\bexplore(s|ing)? possibilities\b/i,
];

export function isProcessLikeFuture(text: string): boolean {
  return PROCESS_LIKE_PATTERNS.some((pattern) => pattern.test(text));
}

export function recoverForecastTitle(source: string, bundle?: GroundingBundle): string | null {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  for (const { pattern, title } of RECOVERY_TITLE_REWRITES) {
    if (pattern.test(trimmed)) {
      if (!bundle || isGroundedFutureText(title, bundle)) {
        return title;
      }
    }
  }

  if (/\b(feedback|users?|mvp|launch|product|customer|market)\b/i.test(trimmed)) {
    if (/\b(change|shift|pivot|different|reject)\b/i.test(trimmed)) {
      const title = "The MVP Solves A Different Problem Than Expected";
      if (!bundle || isGroundedFutureText(title, bundle)) {
        return title;
      }
    }

    if (/\b(first|early|ten|10|100)\b/i.test(trimmed)) {
      const title = "The First 10 Users Arrive";
      if (!bundle || isGroundedFutureText(title, bundle)) {
        return title;
      }
    }
  }

  if (/\b(graduation|job offer|competitor|advocate|side project)\b/i.test(trimmed)) {
    if (/\bgraduation\b/i.test(trimmed)) {
      return "Graduation Creates More Time Than Expected";
    }
    if (/\bjob offer\b/i.test(trimmed)) {
      return "A Job Offer Delays The Launch";
    }
  }

  return null;
}

export function recoverFutureImpact(source: string, bundle?: GroundingBundle): string | null {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  if (isProcessLikeFuture(trimmed)) {
    const recovered = recoverForecastTitle(trimmed, bundle);
    if (recovered) {
      return `${recovered.replace(/^The /, "The ").trim()} within the next few months.`;
    }
  }

  const replacements: Array<{ pattern: RegExp; replacement: string }> = [
    {
      pattern: /early user feedback changes the direction/i,
      replacement: "The first users push the product in a new direction.",
    },
    {
      pattern: /feedback changes direction/i,
      replacement: "Real usage reveals a different problem worth solving.",
    },
    {
      pattern: /validation creates learning/i,
      replacement: "Testing with real users exposes what actually matters.",
    },
  ];

  for (const { pattern, replacement } of replacements) {
    if (pattern.test(trimmed)) {
      if (!bundle || isGroundedFutureText(replacement, bundle)) {
        return replacement;
      }
    }
  }

  return null;
}

export function recoverFutureCandidate(
  source: string,
  bundle?: GroundingBundle,
): { title: string; impact: string } | null {
  const title = recoverForecastTitle(source, bundle);
  if (!title) {
    return null;
  }

  const impact =
    recoverFutureImpact(source, bundle) ??
    `${title} becomes a turning point in the next few months.`;

  if (bundle && mentionsInventedTopic(impact, bundle)) {
    return { title, impact: `${title} changes what you do next.` };
  }

  return { title, impact };
}

function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function uniqueRecoverySources(input: ForecastRecoveryInput): string[] {
  return [
    input.situationTitle,
    input.contextSummary ?? "",
    input.selectedPathTitle ?? "",
    ...input.reasoningSources,
  ]
    .map((source) => source.trim())
    .filter(Boolean);
}

function buildRecoveredFuture(
  title: string,
  impact: string,
  bundle: GroundingBundle,
): ScannableFuture | null {
  if (!title || !isGroundedFutureText(title, bundle)) {
    return null;
  }

  const safeImpact = mentionsInventedTopic(impact, bundle)
    ? `${title} changes what happens next.`
    : impact;

  if (!isGroundedFutureText(safeImpact, bundle)) {
    return null;
  }

  return {
    title,
    whyItMightHappen: buildGroundedWhy(title, bundle, safeImpact),
    signals: ["Named decision", "Current momentum", "Open timeline"],
    futureImpact: safeImpact,
    expansion: null,
    sourceTrace: buildSourceTrace(bundle),
  };
}

export function generateRecoveredFutures(
  input: ForecastRecoveryInput,
  bundle: GroundingBundle,
): ScannableFuture[] {
  const seen = new Set<string>();
  const recovered: ScannableFuture[] = [];

  for (const source of uniqueRecoverySources(input)) {
    const candidate = recoverFutureCandidate(source, bundle);
    if (!candidate) {
      continue;
    }

    const key = normalizeTitleKey(candidate.title);
    if (seen.has(key)) {
      continue;
    }

    const future = buildRecoveredFuture(candidate.title, candidate.impact, bundle);
    if (!future) {
      continue;
    }

    seen.add(key);
    recovered.push(future);
  }

  return recovered;
}

export function shouldRunRecoveryGeneration(survivingCount: number): boolean {
  return survivingCount < RECOVERY_SURVIVAL_THRESHOLD;
}
