"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type DisplayNameFormState = {
  error: string | null;
  saved: boolean;
};

export type EmailChangeFormState = {
  error: string | null;
  /** Set to the requested address once Supabase has accepted the change and sent confirmation email(s). */
  pendingEmail: string | null;
};

const DISPLAY_NAME_MAX_LENGTH = 60;

async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) {
    return origin;
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

/**
 * Updates profiles.display_name — the primary source getUserIdentity() reads
 * for the sidebar and greetings. An empty submission clears the name (the app
 * falls back to a neutral label, never the email).
 */
export async function updateDisplayName(
  _prevState: DisplayNameFormState,
  formData: FormData,
): Promise<DisplayNameFormState> {
  const rawName = formData.get("displayName");

  if (typeof rawName !== "string") {
    return { error: "Something went wrong. Please try again.", saved: false };
  }

  const displayName = rawName.trim();

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      error: `Display names can be up to ${DISPLAY_NAME_MAX_LENGTH} characters.`,
      saved: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in to do that.", saved: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null })
    .eq("id", user.id);

  if (error) {
    return { error: "We couldn't save that just now. Please try again.", saved: false };
  }

  revalidatePath("/settings");
  return { error: null, saved: true };
}

/**
 * Requests an email address change through Supabase auth. The change only
 * takes effect after the confirmation link in the email is clicked, so the
 * form reports a pending state rather than an immediate switch.
 */
export async function requestEmailChange(
  _prevState: EmailChangeFormState,
  formData: FormData,
): Promise<EmailChangeFormState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return { error: "Please enter a valid email address.", pendingEmail: null };
  }

  const newEmail = email.trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in to do that.", pendingEmail: null };
  }

  if (user.email && newEmail.toLowerCase() === user.email.toLowerCase()) {
    return { error: "That's already your email address.", pendingEmail: null };
  }

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${await requestOrigin()}/auth/callback?next=/settings` },
  );

  if (error) {
    return {
      error: "We couldn't start that change just now. Please try again in a minute.",
      pendingEmail: null,
    };
  }

  return { error: null, pendingEmail: newEmail };
}
