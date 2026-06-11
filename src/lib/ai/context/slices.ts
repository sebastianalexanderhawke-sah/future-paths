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

import type { AnsweredPromptResponse } from "@/lib/mock-contradiction-generator";
import type { MockLifeChapterDraft } from "@/lib/mock-timeline-generator";

export type ContextCounts = {
  moments: number;
  checkIns: number;
};

export type IdentityContextBundle = {
  userId: string;
  profile: string;
  moment?: Pick<Moment, "id" | "title" | "description">;
  chosenPath?: Pick<Path, "id" | "description" | "themes" | "future_shift">;
  reflection?: string;
  checkIn?: Pick<CheckIn, "theme_changes" | "identity_impact" | "reflection">;
  checkInHistory?: Pick<CheckIn, "theme_changes">[];
  counts?: ContextCounts;
  pathThemes?: ThemeName[];
  checkIns?: Pick<CheckIn, "theme_changes" | "identity_impact">[];
  identityUpdates?: Pick<IdentityUpdate, "title" | "summary" | "themes">[];
  futureSelves?: Pick<FutureSelf, "name" | "description" | "momentum" | "themes">[];
  currentSelf?: Pick<CurrentSelf, "headline" | "summary" | "themes">;
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
    "id" | "reflection" | "theme_changes" | "identity_impact" | "created_at"
  >[];
  timelineIdentityUpdates?: Pick<
    IdentityUpdate,
    "id" | "title" | "summary" | "themes" | "created_at"
  >[];
  timelineFutureSelves?: Pick<
    FutureSelf,
    "id" | "name" | "momentum" | "themes" | "status" | "updated_at"
  >[];
  chapterCandidates?: MockLifeChapterDraft[];
};
