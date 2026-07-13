"use server";

import { redirect } from "next/navigation";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { createClient } from "@/lib/supabase/server";

/** Same rules as auth's safeRedirectPath: relative, single-origin, no "//". */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "/overview";
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/overview";
  }
  return value;
}

/**
 * Ends onboarding — from the skip link or the final "Enter Reflection"
 * button. Records when the user left the flow on their auth profile so
 * sign-in never routes them back to /welcome, then sends them onward.
 *
 * Recording the flag is best-effort by design: a metadata write failure must
 * never trap someone in onboarding, so the redirect happens regardless.
 */
export async function finishOnboardingAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !user.user_metadata?.onboarding_completed_at) {
    await supabase.auth.updateUser({
      data: { onboarding_completed_at: new Date().toISOString() },
    });
  }

  // Every exit passes through here, so the funnel's end is captured
  // server-side — the redirect that follows can't lose it. The forms say
  // which exit this was; anything unexpected counts as a skip.
  if (user) {
    await captureServerEvent(
      user.id,
      formData.get("outcome") === "completed"
        ? ANALYTICS_EVENTS.onboardingCompleted
        : ANALYTICS_EVENTS.onboardingSkipped,
    );
  }

  redirect(safeNextPath(formData.get("next")));
}
