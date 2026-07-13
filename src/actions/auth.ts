"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { reportError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error: string | null;
};

export type SignUpFormState = {
  error: string | null;
  /**
   * Set when the account was created but Supabase returned no session —
   * email confirmation is enabled and the user must click the link we sent.
   * The form renders the "check your email" state instead of redirecting.
   */
  pendingEmail: string | null;
};

export type PasswordResetRequestState = {
  error: string | null;
  /** True once a request was accepted; the message never reveals whether the account exists. */
  sent: boolean;
};

export type UpdatePasswordFormState = {
  error: string | null;
  updated: boolean;
};

export type ResendConfirmationState = {
  error: string | null;
  resent: boolean;
};

/**
 * Origin for auth email redirect links, derived from the incoming request so
 * the same code works locally and in production without extra configuration.
 */
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

function safeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "/overview";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/overview";
  }

  return value;
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await captureServerEvent(data.user.id, ANALYTICS_EVENTS.signIn);
  }

  // An explicit redirectTo (deep link) always wins. Otherwise a user who has
  // never finished onboarding and has no situations yet gets the guided first
  // run at /welcome — this catches accounts whose email confirmation landed
  // on another device. The situation count keeps accounts that predate
  // onboarding (no flag, plenty of data) out of it, and any doubt resolves
  // to /overview: nobody with real work is ever detoured.
  const explicitRedirect = formData.get("redirectTo");
  if (typeof explicitRedirect === "string" && explicitRedirect) {
    redirect(safeRedirectPath(explicitRedirect));
  }

  const user = data.user;
  if (!user || user.user_metadata?.onboarding_completed_at) {
    redirect("/overview");
  }

  const { count, error: countError } = await supabase
    .from("moments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  redirect(!countError && (count ?? 0) === 0 ? "/welcome" : "/overview");
}

export async function signUp(
  _prevState: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required.", pendingEmail: null };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", pendingEmail: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Confirmed sign-ups are brand new — land them in onboarding.
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=/welcome`,
    },
  });

  if (error) {
    return { error: error.message, pendingEmail: null };
  }

  // The account exists in both branches below (confirmed or awaiting email),
  // so sign_up is captured here, once, at creation. Supabase responds
  // identically for an already-registered address — data.user is present but
  // carries no identities — so that case is skipped to avoid phantom events.
  if (data.user && (data.user.identities?.length ?? 0) > 0) {
    await captureServerEvent(data.user.id, ANALYTICS_EVENTS.signUp, {
      email_confirmation_pending: !data.session,
    });
  }

  // No session means email confirmation is enabled (or the address already has
  // an account — Supabase deliberately responds identically, and so do we):
  // show the "check your email" state rather than bouncing through a redirect
  // that would land back on the login page unexplained.
  if (!data.session) {
    return { error: null, pendingEmail: email };
  }

  redirect("/welcome");
}

export async function resendConfirmationEmail(
  _prevState: ResendConfirmationState,
  formData: FormData,
): Promise<ResendConfirmationState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Something went wrong. Please try signing up again.", resent: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=/welcome`,
    },
  });

  if (error) {
    // Usually rate limiting; the exact reason doesn't help the user here.
    return {
      error: "We couldn't resend the email just now. Please wait a minute and try again.",
      resent: false,
    };
  }

  return { error: null, resent: true };
}

export async function requestPasswordReset(
  _prevState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Please enter your email address.", sent: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=/update-password`,
  });

  // Deliberately the same response whether or not the account exists — and
  // even when Supabase errors (usually rate limiting): confirming a failure
  // for one address but not another would leak which accounts exist. The
  // real failure is still visible server-side.
  if (error) {
    await reportError("auth: password reset request failed", error.message);
  }

  return { error: null, sent: true };
}

export async function updatePassword(
  _prevState: UpdatePasswordFormState,
  formData: FormData,
): Promise<UpdatePasswordFormState> {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return { error: "Please fill in both fields.", updated: false };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", updated: false };
  }

  if (password !== confirmPassword) {
    return { error: "Those passwords don't match.", updated: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your reset link has expired. Please request a new one.",
      updated: false,
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message, updated: false };
  }

  return { error: null, updated: true };
}

export async function signOut() {
  const supabase = await createClient();

  // Capture before the session is destroyed — afterwards there is no user
  // to attribute the event to.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await captureServerEvent(user.id, ANALYTICS_EVENTS.signOut);
  }

  await supabase.auth.signOut();
  redirect("/");
}
