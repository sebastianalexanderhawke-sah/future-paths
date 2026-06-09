import { createClient } from "@/lib/supabase/server";
import type { TimelineEvent } from "@/types/database";

export async function listRecentTimelineEvents(
  limit = 8,
): Promise<{ events: TimelineEvent[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message };
  }

  return { events: data };
}
