import { requestCurrentSelfRegeneration } from "@/lib/current-self";
import { generateFutureSelves } from "@/lib/future-selves";
import { evaluateReflectionQuestion } from "@/lib/reflection-question";
import { validateReflectionAnswerLength } from "@/lib/reflections-validation";
import { createClient } from "@/lib/supabase/server";
import type { CheckIn, Moment } from "@/types/database";

export type ReflectionCheckIn = CheckIn & {
  moment: Pick<Moment, "title" | "description" | "current_understanding">;
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
    .select("id, title, description, current_understanding")
    .eq("user_id", userId)
    .in("id", momentIds);

  const momentById = new Map((moments ?? []).map((moment) => [moment.id, moment]));

  return checkIns.map((checkIn) => {
    const moment = momentById.get(checkIn.moment_id);
    return {
      ...checkIn,
      moment: {
        title: moment?.title ?? "Situation",
        description: moment?.description ?? null,
        current_understanding: moment?.current_understanding ?? null,
      },
    };
  });
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
    .order("created_at", { ascending: true }); // oldest first — queue order

  if (error) {
    return { error: error.message };
  }

  // Filter unanswered in JavaScript so both NULL and empty-string are treated
  // as unanswered, consistent with how listReflectionCheckIns handles this.
  const pendingRows = (data ?? []).filter((row) => !row.reflection_answer);
  const pendingCheckIns = await attachMomentsToCheckIns(pendingRows, auth.userId);

  return {
    unansweredCount: pendingRows.length,
    // First item is the oldest unanswered — the active queue entry.
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

  // Advance the queue: evaluate the next unanswered check-in so the user
  // never lands on an empty reflection queue after answering one.
  await advanceReflectionQueue(auth.userId).catch(() => {});

  return { ok: true };
}

// Finds the most recent check-ins without a reflection_question and evaluates
// them one-by-one until a worthy question is generated. Stops after saving one
// so the queue advances by exactly one entry at a time.
async function advanceReflectionQueue(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: candidates } = await supabase
    .from("check_ins")
    .select("id, reflection, reality_summary")
    .eq("user_id", userId)
    .is("reflection_question", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!candidates || candidates.length === 0) return;

  for (const candidate of candidates) {
    if (!candidate.reflection || !candidate.reality_summary) continue;

    const result = await evaluateReflectionQuestion(
      userId,
      candidate.reflection,
      candidate.reality_summary,
    ).catch(() => null);

    if (result?.should_reflect && result.question) {
      await supabase
        .from("check_ins")
        .update({ reflection_question: result.question })
        .eq("id", candidate.id)
        .eq("user_id", userId);
      return;
    }
  }
}
