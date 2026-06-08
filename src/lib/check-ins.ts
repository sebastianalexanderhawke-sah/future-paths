import { generateMockCheckIn } from "@/lib/mock-checkin-generator";
import { createClient } from "@/lib/supabase/server";
import type { CheckIn } from "@/types/database";

const REFLECTION_MAX_LENGTH = 5000;

type AuthSuccess = { userId: string };
type AuthFailure = { error: string };

async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Not authenticated." };
  }

  return { userId: user.id };
}

function validateReflection(reflection: string): string | null {
  const trimmed = reflection.trim();

  if (!trimmed) {
    return "Reflection is required.";
  }

  if (trimmed.length > REFLECTION_MAX_LENGTH) {
    return `Reflection must be ${REFLECTION_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export async function listCheckInsForMoment(
  momentId: string,
): Promise<{ checkIns: CheckIn[] } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { checkIns: data };
}

export async function createCheckIn(
  momentId: string,
  reflection: string,
): Promise<{ checkIn: CheckIn } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const reflectionError = validateReflection(reflection);
  if (reflectionError) {
    return { error: reflectionError };
  }

  const trimmedReflection = reflection.trim();
  const supabase = await createClient();

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .select("*")
    .eq("id", momentId)
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .maybeSingle();

  if (momentError) {
    return { error: momentError.message };
  }

  if (!moment) {
    return { error: "Moment not found." };
  }

  const { data: chosenPath, error: pathError } = await supabase
    .from("paths")
    .select("*")
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId)
    .eq("is_chosen", true)
    .maybeSingle();

  if (pathError) {
    return { error: pathError.message };
  }

  if (!chosenPath) {
    return { error: "Choose a path before checking in." };
  }

  const { count, error: countError } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("moment_id", momentId)
    .eq("user_id", auth.userId);

  if (countError) {
    return { error: countError.message };
  }

  const isFirstCheckIn = (count ?? 0) === 0;

  const generated = generateMockCheckIn({
    moment,
    path: chosenPath,
    reflection: trimmedReflection,
  });

  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .insert({
      user_id: auth.userId,
      moment_id: momentId,
      path_id: chosenPath.id,
      reflection: trimmedReflection,
      reality_summary: generated.reality_summary,
      theme_changes: generated.theme_changes,
      identity_impact: generated.identity_impact,
    })
    .select("*")
    .single();

  if (checkInError || !checkIn) {
    return { error: checkInError?.message ?? "Failed to create check-in." };
  }

  const { error: timelineError } = await supabase.from("timeline_events").insert({
    user_id: auth.userId,
    event_type: "check_in_recorded",
    reference_type: "check_in",
    reference_id: checkIn.id,
    title: "Reality recorded",
    summary: generated.reality_summary,
    metadata: {
      moment_id: momentId,
      path_id: chosenPath.id,
      check_in_id: checkIn.id,
      theme_changes: generated.theme_changes,
      identity_impact: generated.identity_impact,
    },
  });

  if (timelineError) {
    return { error: timelineError.message };
  }

  if (isFirstCheckIn || !chosenPath.is_locked) {
    const { error: lockError } = await supabase
      .from("paths")
      .update({ is_locked: true })
      .eq("id", chosenPath.id)
      .eq("user_id", auth.userId)
      .eq("is_locked", false);

    if (lockError) {
      return { error: lockError.message };
    }
  }

  return { checkIn };
}
