import type {
  FutureSelfEventType,
  FutureSelfStage,
  FutureSelfStatus,
  AlternateSelfStatus,
  LifeChapterEvidenceType,
  LifeChapterStatus,
  PastCrossroadStatus,
  ContradictionEventType,
  ContradictionStatus,
  ContradictionType,
  IdentityPromptStatus,
  IdentityPromptType,
  IdentityUpdateType,
  MomentStatus,
  ThemeName,
  TimelineEventType,
  TimelineReferenceType,
} from "@/types/enums";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Moment = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  current_understanding: string | null;
  status: MomentStatus;
  created_at: string;
  updated_at: string;
};

export type Path = {
  id: string;
  moment_id: string;
  user_id: string;
  description: string;
  benefits: string[];
  consequences: string[];
  future_shift: string;
  themes: ThemeName[];
  sort_order: number;
  is_chosen: boolean;
  is_locked: boolean;
  chosen_at: string | null;
  created_at: string;
};

export type ThemeChange = {
  theme: ThemeName;
  direction: "strengthened" | "weakened" | "emerging";
};

export type CheckIn = {
  id: string;
  user_id: string;
  moment_id: string;
  path_id: string;
  reflection: string;
  reality_summary: string;
  theme_changes: ThemeChange[];
  identity_impact: string;
  created_at: string;
};

export type IdentityUpdate = {
  id: string;
  user_id: string;
  moment_id: string;
  check_in_id: string;
  update_type: IdentityUpdateType;
  title: string;
  summary: string;
  themes: ThemeName[];
  created_at: string;
};

export type FutureSelf = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  stage: FutureSelfStage;
  momentum: number;
  themes: ThemeName[];
  status: FutureSelfStatus;
  created_at: string;
  updated_at: string;
};

export type FutureSelfEvent = {
  id: string;
  user_id: string;
  future_self_id: string;
  event_type: FutureSelfEventType;
  momentum_before: number | null;
  momentum_after: number;
  summary: string | null;
  created_at: string;
};

export type CurrentSelf = {
  id: string;
  user_id: string;
  headline: string;
  summary: string;
  themes: ThemeName[];
  created_at: string;
  updated_at: string;
};

export type IdentityPrompt = {
  id: string;
  user_id: string;
  prompt_type: IdentityPromptType;
  question: string;
  context: string | null;
  themes: ThemeName[];
  status: IdentityPromptStatus;
  created_at: string;
};

export type IdentityPromptResponse = {
  id: string;
  user_id: string;
  prompt_id: string;
  response: string;
  themes: ThemeName[];
  created_at: string;
};

export type ContradictionSourceRefs = {
  current_self_id?: string;
  future_self_ids?: string[];
  prompt_response_ids?: string[];
};

export type Contradiction = {
  id: string;
  user_id: string;
  contradiction_type: ContradictionType;
  title: string;
  summary: string;
  pole_a: string;
  pole_b: string;
  themes: ThemeName[];
  intensity: number;
  status: ContradictionStatus;
  source_refs: ContradictionSourceRefs;
  signature: string;
  created_at: string;
  updated_at: string;
};

export type ContradictionEvent = {
  id: string;
  user_id: string;
  contradiction_id: string;
  event_type: ContradictionEventType;
  intensity_before: number | null;
  intensity_after: number | null;
  summary: string | null;
  created_at: string;
};

export type PastCrossroad = {
  id: string;
  user_id: string;
  what_happened: string;
  why_chosen: string | null;
  life_stage: string | null;
  status: PastCrossroadStatus;
  created_at: string;
  updated_at: string;
};

export type PastAlternativePath = {
  id: string;
  past_crossroad_id: string;
  user_id: string;
  title: string;
  description: string;
  themes: ThemeName[];
  possible_future_shift: string;
  sort_order: number;
  is_selected: boolean;
  created_at: string;
};

export type AlternateSelf = {
  id: string;
  user_id: string;
  past_crossroad_id: string;
  selected_alternative_path_id: string;
  name: string;
  road_not_taken: string;
  alternate_self: string;
  what_remains_available: string;
  themes: ThemeName[];
  status: AlternateSelfStatus;
  created_at: string;
  updated_at: string;
};

export type LifeChapter = {
  id: string;
  user_id: string;
  title: string;
  period_label: string;
  starts_at: string;
  ends_at: string;
  summary: string;
  themes: ThemeName[];
  includes_current_self: boolean;
  status: LifeChapterStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type LifeChapterEvidence = {
  id: string;
  life_chapter_id: string;
  user_id: string;
  evidence_type: LifeChapterEvidenceType;
  evidence_id: string;
  label: string;
  occurred_at: string;
  sort_order: number;
  created_at: string;
};

export type TimelineEventMetadata = {
  moment_id?: string;
  moment_title?: string;
  path_id?: string;
  path_description?: string;
  path_count?: number;
  check_in_id?: string;
  identity_update_id?: string;
  update_type?: IdentityUpdateType;
  themes?: ThemeName[];
  theme_changes?: ThemeChange[];
  identity_impact?: string;
  [key: string]:
    | string
    | number
    | boolean
    | ThemeName[]
    | ThemeChange[]
    | undefined;
};

export type TimelineEvent = {
  id: string;
  user_id: string;
  event_type: TimelineEventType;
  reference_type: TimelineReferenceType;
  reference_id: string;
  title: string;
  summary: string | null;
  metadata: TimelineEventMetadata;
  occurred_at: string;
  created_at: string;
};

export type ProfileInsert = Pick<Profile, "id" | "email"> & {
  display_name?: string | null;
};

export type ProfileUpdate = Partial<Pick<Profile, "display_name" | "email">>;

export type MomentInsert = Pick<Moment, "user_id" | "title"> & {
  description?: string | null;
  current_understanding?: string | null;
  status?: MomentStatus;
};

export type MomentUpdate = Partial<
  Pick<Moment, "title" | "description" | "current_understanding" | "status">
>;

export type PathInsert = Pick<
  Path,
  | "moment_id"
  | "user_id"
  | "description"
  | "future_shift"
  | "sort_order"
> & {
  benefits?: string[];
  consequences?: string[];
  themes?: ThemeName[];
  is_chosen?: boolean;
  is_locked?: boolean;
  chosen_at?: string | null;
};

export type PathUpdate = Partial<
  Pick<Path, "is_chosen" | "is_locked" | "chosen_at">
>;

export type CheckInInsert = Pick<
  CheckIn,
  | "user_id"
  | "moment_id"
  | "path_id"
  | "reflection"
  | "reality_summary"
  | "identity_impact"
> & {
  theme_changes?: ThemeChange[];
};

export type IdentityUpdateInsert = Pick<
  IdentityUpdate,
  | "user_id"
  | "moment_id"
  | "check_in_id"
  | "update_type"
  | "title"
  | "summary"
> & {
  themes?: ThemeName[];
};

export type FutureSelfInsert = Pick<
  FutureSelf,
  "user_id" | "name" | "description" | "stage" | "momentum"
> & {
  themes?: ThemeName[];
  status?: FutureSelfStatus;
};

export type FutureSelfUpdate = Partial<
  Pick<
    FutureSelf,
    "description" | "stage" | "momentum" | "themes" | "status" | "updated_at"
  >
>;

export type FutureSelfEventInsert = Pick<
  FutureSelfEvent,
  "user_id" | "future_self_id" | "event_type" | "momentum_after"
> & {
  momentum_before?: number | null;
  summary?: string | null;
};

export type CurrentSelfInsert = Pick<
  CurrentSelf,
  "user_id" | "headline" | "summary"
> & {
  themes?: ThemeName[];
};

export type CurrentSelfUpdate = Partial<
  Pick<CurrentSelf, "headline" | "summary" | "themes" | "updated_at">
>;

export type IdentityPromptInsert = Pick<
  IdentityPrompt,
  "user_id" | "prompt_type" | "question"
> & {
  context?: string | null;
  themes?: ThemeName[];
  status?: IdentityPromptStatus;
};

export type IdentityPromptUpdate = Partial<
  Pick<IdentityPrompt, "status">
>;

export type IdentityPromptResponseInsert = Pick<
  IdentityPromptResponse,
  "user_id" | "prompt_id" | "response"
> & {
  themes?: ThemeName[];
};

export type ContradictionInsert = Pick<
  Contradiction,
  | "user_id"
  | "contradiction_type"
  | "title"
  | "summary"
  | "pole_a"
  | "pole_b"
  | "signature"
> & {
  themes?: ThemeName[];
  intensity?: number;
  status?: ContradictionStatus;
  source_refs?: ContradictionSourceRefs;
};

export type ContradictionUpdate = Partial<
  Pick<
    Contradiction,
    | "title"
    | "summary"
    | "pole_a"
    | "pole_b"
    | "themes"
    | "intensity"
    | "status"
    | "source_refs"
    | "updated_at"
  >
>;

export type ContradictionEventInsert = Pick<
  ContradictionEvent,
  "user_id" | "contradiction_id" | "event_type"
> & {
  intensity_before?: number | null;
  intensity_after?: number | null;
  summary?: string | null;
};

export type PastCrossroadInsert = Pick<
  PastCrossroad,
  "user_id" | "what_happened"
> & {
  why_chosen?: string | null;
  life_stage?: string | null;
  status?: PastCrossroadStatus;
};

export type PastCrossroadUpdate = Partial<
  Pick<PastCrossroad, "status" | "updated_at">
>;

export type PastAlternativePathInsert = Pick<
  PastAlternativePath,
  | "past_crossroad_id"
  | "user_id"
  | "title"
  | "description"
  | "possible_future_shift"
  | "sort_order"
> & {
  themes?: ThemeName[];
  is_selected?: boolean;
};

export type PastAlternativePathUpdate = Partial<
  Pick<PastAlternativePath, "is_selected">
>;

export type AlternateSelfInsert = Pick<
  AlternateSelf,
  | "user_id"
  | "past_crossroad_id"
  | "selected_alternative_path_id"
  | "name"
  | "road_not_taken"
  | "alternate_self"
  | "what_remains_available"
> & {
  themes?: ThemeName[];
  status?: AlternateSelfStatus;
};

export type AlternateSelfUpdate = Partial<
  Pick<
    AlternateSelf,
    | "selected_alternative_path_id"
    | "name"
    | "road_not_taken"
    | "alternate_self"
    | "what_remains_available"
    | "themes"
    | "status"
    | "updated_at"
  >
>;

export type LifeChapterInsert = Pick<
  LifeChapter,
  | "user_id"
  | "title"
  | "period_label"
  | "starts_at"
  | "ends_at"
  | "summary"
  | "sort_order"
> & {
  themes?: ThemeName[];
  includes_current_self?: boolean;
  status?: LifeChapterStatus;
};

export type LifeChapterUpdate = Partial<
  Pick<
    LifeChapter,
    | "title"
    | "summary"
    | "themes"
    | "includes_current_self"
    | "status"
    | "sort_order"
    | "updated_at"
  >
>;

export type LifeChapterEvidenceInsert = Pick<
  LifeChapterEvidence,
  | "life_chapter_id"
  | "user_id"
  | "evidence_type"
  | "evidence_id"
  | "label"
  | "occurred_at"
> & {
  sort_order?: number;
};

export type TimelineEventInsert = Pick<
  TimelineEvent,
  | "user_id"
  | "event_type"
  | "reference_type"
  | "reference_id"
  | "title"
> & {
  summary?: string | null;
  metadata?: TimelineEventMetadata;
  occurred_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      moments: {
        Row: Moment;
        Insert: MomentInsert;
        Update: MomentUpdate;
        Relationships: [
          {
            foreignKeyName: "moments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      paths: {
        Row: Path;
        Insert: PathInsert;
        Update: PathUpdate;
        Relationships: [
          {
            foreignKeyName: "paths_moment_id_fkey";
            columns: ["moment_id"];
            referencedRelation: "moments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paths_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      timeline_events: {
        Row: TimelineEvent;
        Insert: TimelineEventInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "timeline_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      check_ins: {
        Row: CheckIn;
        Insert: CheckInInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "check_ins_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_moment_id_fkey";
            columns: ["moment_id"];
            referencedRelation: "moments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_path_id_fkey";
            columns: ["path_id"];
            referencedRelation: "paths";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_updates: {
        Row: IdentityUpdate;
        Insert: IdentityUpdateInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "identity_updates_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_updates_moment_id_fkey";
            columns: ["moment_id"];
            referencedRelation: "moments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_updates_check_in_id_fkey";
            columns: ["check_in_id"];
            referencedRelation: "check_ins";
            referencedColumns: ["id"];
          },
        ];
      };
      future_selves: {
        Row: FutureSelf;
        Insert: FutureSelfInsert;
        Update: FutureSelfUpdate;
        Relationships: [
          {
            foreignKeyName: "future_selves_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      future_self_events: {
        Row: FutureSelfEvent;
        Insert: FutureSelfEventInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "future_self_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "future_self_events_future_self_id_fkey";
            columns: ["future_self_id"];
            referencedRelation: "future_selves";
            referencedColumns: ["id"];
          },
        ];
      };
      current_self: {
        Row: CurrentSelf;
        Insert: CurrentSelfInsert;
        Update: CurrentSelfUpdate;
        Relationships: [
          {
            foreignKeyName: "current_self_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_prompts: {
        Row: IdentityPrompt;
        Insert: IdentityPromptInsert;
        Update: IdentityPromptUpdate;
        Relationships: [
          {
            foreignKeyName: "identity_prompts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_prompt_responses: {
        Row: IdentityPromptResponse;
        Insert: IdentityPromptResponseInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "identity_prompt_responses_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_prompt_responses_prompt_id_fkey";
            columns: ["prompt_id"];
            referencedRelation: "identity_prompts";
            referencedColumns: ["id"];
          },
        ];
      };
      contradictions: {
        Row: Contradiction;
        Insert: ContradictionInsert;
        Update: ContradictionUpdate;
        Relationships: [
          {
            foreignKeyName: "contradictions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contradiction_events: {
        Row: ContradictionEvent;
        Insert: ContradictionEventInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "contradiction_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contradiction_events_contradiction_id_fkey";
            columns: ["contradiction_id"];
            referencedRelation: "contradictions";
            referencedColumns: ["id"];
          },
        ];
      };
      past_crossroads: {
        Row: PastCrossroad;
        Insert: PastCrossroadInsert;
        Update: PastCrossroadUpdate;
        Relationships: [
          {
            foreignKeyName: "past_crossroads_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      past_alternative_paths: {
        Row: PastAlternativePath;
        Insert: PastAlternativePathInsert;
        Update: PastAlternativePathUpdate;
        Relationships: [
          {
            foreignKeyName: "past_alternative_paths_past_crossroad_id_fkey";
            columns: ["past_crossroad_id"];
            referencedRelation: "past_crossroads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "past_alternative_paths_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      alternate_selves: {
        Row: AlternateSelf;
        Insert: AlternateSelfInsert;
        Update: AlternateSelfUpdate;
        Relationships: [
          {
            foreignKeyName: "alternate_selves_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alternate_selves_past_crossroad_id_fkey";
            columns: ["past_crossroad_id"];
            referencedRelation: "past_crossroads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alternate_selves_selected_alternative_path_id_fkey";
            columns: ["selected_alternative_path_id"];
            referencedRelation: "past_alternative_paths";
            referencedColumns: ["id"];
          },
        ];
      };
      life_chapters: {
        Row: LifeChapter;
        Insert: LifeChapterInsert;
        Update: LifeChapterUpdate;
        Relationships: [
          {
            foreignKeyName: "life_chapters_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      life_chapter_evidence: {
        Row: LifeChapterEvidence;
        Insert: LifeChapterEvidenceInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "life_chapter_evidence_life_chapter_id_fkey";
            columns: ["life_chapter_id"];
            referencedRelation: "life_chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "life_chapter_evidence_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
