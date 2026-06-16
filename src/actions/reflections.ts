"use server";

import { revalidatePath } from "next/cache";

import { submitReflectionAnswer as submitReflectionAnswerLib } from "@/lib/reflections";

export type ReflectionAnswerFormState = {
  error: string | null;
};

export async function submitReflectionAnswerAction(
  _prevState: ReflectionAnswerFormState,
  formData: FormData,
): Promise<ReflectionAnswerFormState> {
  const checkInId = formData.get("checkInId");
  const answer = formData.get("answer");

  if (typeof checkInId !== "string" || !checkInId) {
    return { error: "Invalid form submission." };
  }

  if (typeof answer !== "string") {
    return { error: "Answer is required." };
  }

  const result = await submitReflectionAnswerLib(checkInId, answer);

  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/reflections");
  revalidatePath("/overview");

  return { error: null };
}
