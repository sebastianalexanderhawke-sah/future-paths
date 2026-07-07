import { createClient } from "@/lib/supabase/server";

export type NavActivity = {
  /** Latest timeline event for the user, or null when the timeline is empty. */
  timelineAt: string | null;
  /** When the Current Self narrative last evolved, or null before it exists. */
  currentSelfAt: string | null;
};

const EMPTY: NavActivity = { timelineAt: null, currentSelfAt: null };

/**
 * Latest-change timestamps for the sidebar's unseen-update dots. Two
 * single-row indexed lookups, so the shell can afford them on every page.
 * "Seen" state lives client-side (same localStorage pattern the overview's
 * visit marker used), so this stays a pure read.
 */
export async function getNavActivity(): Promise<NavActivity> {
  // Decorative signal only: any failure means "no dots", never a broken page.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return EMPTY;

    const [timelineResult, currentSelfResult] = await Promise.all([
      supabase
        .from("timeline_events")
        .select("occurred_at")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("current_self")
        .select("updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    return {
      timelineAt: timelineResult.data?.occurred_at ?? null,
      currentSelfAt: currentSelfResult.data?.updated_at ?? null,
    };
  } catch {
    return EMPTY;
  }
}
