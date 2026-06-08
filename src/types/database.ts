import type {
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

export type TimelineEventMetadata = {
  moment_id?: string;
  moment_title?: string;
  path_id?: string;
  path_description?: string;
  path_count?: number;
  themes?: ThemeName[];
  [key: string]: string | number | boolean | ThemeName[] | undefined;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
