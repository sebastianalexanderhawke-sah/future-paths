import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import { generateFutureSelves } from "@/lib/future-selves";
import { validateReflectionAnswerLength } from "@/lib/reflections-validation";
import { createClient } from "@/lib/supabase/server";
import type { CheckIn, Moment } from "@/types/database";

export type ReflectionCheckIn = CheckIn & {
  moment: Pick<Moment, "title">;
};

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

function validateReflectionAnswer(answer: string): string | null {
  return validateReflectionAnswerLength(answer);
}

async function attachMomentsToCheckIns(
  checkIns: CheckIn[],
  userId: string,
): Promise<ReflectionCheckIn[]> {
  if (checkIns.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const momentIds = [...new Set(checkIns.map((checkIn) => checkIn.moment_id))];
  const { data: moments } = await supabase
    .from("moments")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", momentIds);

  const titleByMomentId = new Map((moments ?? []).map((moment) => [moment.id, moment.title]));

  return checkIns.map((checkIn) => ({
    ...checkIn,
    moment: { title: titleByMomentId.get(checkIn.moment_id) ?? "Situation" },
  }));
}

export async function listReflectionCheckIns(): Promise<
  { checkIns: ReflectionCheckIn[] } | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", auth.userId)
    .not("reflection_question", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const checkIns = await attachMomentsToCheckIns(data ?? [], auth.userId);
  return { checkIns };
}

export async function getUnansweredReflectionSummary(): Promise<
  | {
      unansweredCount: number;
      pending: ReflectionCheckIn | null;
    }
  | { error: string }
> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", auth.userId)
    .not("reflection_question", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  // Filter unanswered in JavaScript — not at the DB level — so that both
  // NULL and empty-string defaults for reflection_answer are treated as
  // unanswered, consistent with how listReflectionCheckIns handles this.
  const pendingRows = (data ?? []).filter((row) => !row.reflection_answer);
  const pendingCheckIns = await attachMomentsToCheckIns(pendingRows, auth.userId);

  return {
    unansweredCount: pendingRows.length,
    pending: pendingCheckIns[0] ?? null,
  };
}

export async function submitReflectionAnswer(
  checkInId: string,
  answer: string,
): Promise<{ ok: true } | { error: string }> {
  const auth = await requireUser();
  if ("error" in auth) {
    return auth;
  }

  const validationError = validateReflectionAnswer(answer);
  if (validationError) {
    return { error: validationError };
  }

  const trimmedAnswer = answer.trim();
  const supabase = await createClient();

  const { data: checkIn, error: fetchError } = await supabase
    .from("check_ins")
    .select("*")
    .eq("id", checkInId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!checkIn) {
    return { error: "Check-in not found." };
  }

  if (!checkIn.reflection_question) {
    return { error: "This check-in has no reflection question." };
  }

  if (checkIn.reflection_answer) {
    return { error: "This reflection has already been answered." };
  }

  const { error: updateError } = await supabase
    .from("check_ins")
    .update({ reflection_answer: trimmedAnswer })
    .eq("id", checkInId)
    .eq("user_id", auth.userId);

  if (updateError) {
    return { error: updateError.message };
  }

  const { data: moment } = await supabase
    .from("moments")
    .select("title")
    .eq("id", checkIn.moment_id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  // Reflection answered: the user has already done the interpretive work,
  // so this is eligible to update Current Self immediately, bypassing the
  // debounce that applies to routine events.
  await requestCurrentSelfRegeneration(auth.userId, {
    immediate: true,
    reflectionInput: {
      reflection: {
        question: checkIn.reflection_question,
        answer: trimmedAnswer,
        checkInReflection: checkIn.reflection,
        momentTitle: moment?.title ?? "Untitled situation",
      },
    },
  });

  // Reflection answers are first-class identity evidence — regenerate Future
  // Selves so they can incorporate the user's own interpretation of what the
  // experience revealed, in addition to Current Self which already receives it.
  await generateFutureSelves().catch(() => {});

  return { ok: true };
}
