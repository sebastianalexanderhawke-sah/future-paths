import { createClient } from "@/lib/supabase/server";
import type { Moment } from "@/types/database";

export type MomentNeedingCheckIn = {
  moment: Moment;
  hasCheckIns: boolean;
};

export async function listMomentsNeedingCheckIn(): Promise<
  { moments: MomentNeedingCheckIn[] } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated." };
  }

  const { data: moments, error: momentsError } = await supabase
    .from("moments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (momentsError) {
    return { error: momentsError.message };
  }

  if (!moments?.length) {
    return { moments: [] };
  }

  const { data: chosenPaths, error: pathsError } = await supabase
    .from("paths")
    .select("moment_id")
    .eq("user_id", user.id)
    .eq("is_chosen", true);

  if (pathsError) {
    return { error: pathsError.message };
  }

  const chosenMomentIds = new Set(chosenPaths?.map((path) => path.moment_id) ?? []);
  const eligible = moments.filter((moment) => chosenMomentIds.has(moment.id));

  if (!eligible.length) {
    return { moments: [] };
  }

  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("moment_id")
    .eq("user_id", user.id)
    .in(
      "moment_id",
      eligible.map((moment) => moment.id),
    );

  if (checkInsError) {
    return { error: checkInsError.message };
  }

  const momentsWithCheckIns = new Set(checkIns?.map((checkIn) => checkIn.moment_id) ?? []);

  const result = eligible.map((moment) => ({
    moment,
    hasCheckIns: momentsWithCheckIns.has(moment.id),
  }));

  result.sort((a, b) => {
    if (a.hasCheckIns === b.hasCheckIns) {
      return 0;
    }
    return a.hasCheckIns ? 1 : -1;
  });

  return { moments: result };
}
