import type {
  FutureSelfEventType,
  FutureSelfStage,
  FutureSelfStatus,
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
