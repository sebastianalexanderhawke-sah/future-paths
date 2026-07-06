"use server";

import { redirect } from "next/navigation";

import { createCheckIn } from "@/lib/check-ins";

export type CheckInFormState = {
  error: string | null;
};

function redirectWithError(momentId: string, error: string): never {
  redirect(`/moments/${momentId}?error=${encodeURIComponent(error)}`);
}

export async function createCheckInAction(
  _prevState: CheckInFormState,
  formData: FormData,
): Promise<CheckInFormState> {
  const momentId = formData.get("momentId");
  const reflection = formData.get("reflection");
  const clientToken = formData.get("clientToken");

  if (typeof momentId !== "string") {
    return { error: "Invalid form submission." };
  }

  if (typeof reflection !== "string") {
    return { error: "Describe what happened first." };
  }

  const result = await createCheckIn(
    momentId,
    reflection,
    typeof clientToken === "string" && clientToken ? clientToken : null,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  redirect(`/moments/${momentId}`);
}
