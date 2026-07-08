import type {
  AlternateSelf,
  CheckIn,
  Contradiction,
  CurrentSelf,
  FutureSelf,
  IdentityUpdate,
  Moment,
  Path,
  PastCrossroad,
  PastAlternativePath,
} from "@/types/database";
import type { ThemeName } from "@/types/enums";

export type ForecastPathContext = {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  consequences: string[];
  future_shift: string;
  themes: ThemeName[];
};

import type { AnsweredPromptResponse } from "@/lib/mock-contradiction-generator";
import type { MockLifeChapterDraft } from "@/lib/mock-timeline-generator";
import type { MonthlyIdentityEvolution } from "@/lib/monthly-identity-evolution";

export type ContextCounts = {
  moments: number;
  checkIns: number;
};

export type IdentityContextBundle = {
  userId: string;
  profile: string;
  moment?: Pick<Moment, "id" | "title" | "description">;
  chosenPath?: Pick<Path, "id" | "description" | "themes" | "future_shift">;
  selectedForecastPath?: ForecastPathContext;
  reflection?: string;
  checkIn?: Pick<CheckIn, "theme_changes" | "identity_impact" | "reflection">;
  checkInHistory?: Pick<CheckIn, "theme_changes">[];
  counts?: ContextCounts;
  pathThemes?: ThemeName[];
  // The single most recently chosen path, surfaced as its own field rather
  // than buried in pathThemes' flattened theme history — Future Self
  // generation must always be able to see the newest decision distinctly
  // from older accumulated pattern evidence.
  mostRecentChosenPath?: Pick<Path, "description" | "themes" | "chosen_at" | "future_shift">;
  // Themes with materially present negative evidence (risk themes on recent
  // situations, repeated weakened check-ins) — set only when that threshold
  // is met, so future_self generation can be told to ensure a risk-led
  // trajectory instead of leaving risk evidence subordinate to positive ones.
  riskFocusThemes?: ThemeName[];
  checkIns?: {
    theme_changes: CheckIn["theme_changes"];
    identity_impact: string;
    reality_summary?: string;
    reflection_question?: string | null;
    reflection_answer?: string | null;
  }[];
  // Reflection Q&A pairs where the user has written an answer — the highest-confidence
  // identity evidence, separated from general check-ins so the AI can treat them distinctly.
  confirmedReflections?: { question: string; answer: string }[];
  identityUpdates?: Pick<IdentityUpdate, "title" | "summary" | "themes">[];
  futureSelves?: Pick<
    FutureSelf,
    "name" | "summary" | "percentage" | "evidence_strength" | "themes"
  >[];
  currentSelf?: Pick<
    CurrentSelf,
    "title" | "summary" | "themes" | "values" | "afraid_of_becoming" | "core_tension" | "recent_growth"
  >;
  // Richer Current Self evidence — recent situations, chosen path details,
  // and full check-in narratives (reflection/reality/reflection Q&A), so the
  // generated snapshot can cite specific evidence rather than just themes.
  recentMoments?: Pick<Moment, "id" | "title" | "description" | "status" | "created_at">[];
  currentSelfChosenPaths?: Pick<Path, "id" | "moment_id" | "description" | "themes" | "future_shift">[];
  currentSelfCheckIns?: Pick<
    CheckIn,
    | "id"
    | "moment_id"
    | "theme_changes"
    | "identity_impact"
    | "reflection_question"
    | "reflection_answer"
    | "created_at"
  >[];
  answeredPrompts?: AnsweredPromptResponse[];
  checkInCount?: number;
  pastCrossroad?: Pick<
    PastCrossroad,
    "id" | "what_happened" | "why_chosen" | "life_stage"
  >;
  selectedPastPath?: Pick<
    PastAlternativePath,
    "title" | "description" | "themes" | "possible_future_shift"
  >;
  alternateSelves?: Pick<
    AlternateSelf,
    "id" | "name" | "themes" | "status" | "updated_at" | "past_crossroad_id"
  >[];
  crossroadSnippets?: Record<string, string>;
  contradictions?: Pick<
    Contradiction,
    "id" | "title" | "themes" | "intensity" | "status" | "updated_at"
  >[];
  timelineMoments?: Pick<Moment, "id" | "title" | "created_at" | "status">[];
  timelineChosenPaths?: Pick<
    Path,
    "id" | "moment_id" | "description" | "themes" | "chosen_at" | "created_at"
  >[];
  timelineCheckIns?: Pick<
    CheckIn,
    "id" | "reflection" | "theme_changes" | "identity_impact" | "created_at" | "reflection_question" | "reflection_answer"
  >[];
  timelineIdentityUpdates?: Pick<
    IdentityUpdate,
    "id" | "title" | "summary" | "themes" | "created_at"
  >[];
  timelineFutureSelves?: Pick<
    FutureSelf,
    "id" | "name" | "percentage" | "themes" | "status" | "updated_at"
  >[];
  chapterCandidates?: MockLifeChapterDraft[];
  // Pre-aggregated, deterministic monthly evidence from the aggregation
  // layer — this profile's only job is turning each month's evidence into
  // a title/summary/identity-changes narrative, not re-deriving the
  // aggregation itself.
  monthlyIdentityEvolution?: MonthlyIdentityEvolution[];
  discoveryGoal?: "decision" | "forecast";
  discoveryAdditionalContext?: string;
  checkInSummaries?: string[];
  realitySummary?: string;
  reflectionQA?: {
    question: string;
    answer: string;
    checkInReflection: string;
    momentTitle: string;
  };
};
