"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  resendConfirmationEmail,
  signUp,
  type ResendConfirmationState,
  type SignUpFormState,
} from "@/actions/auth";

const initialState: SignUpFormState = { error: null, pendingEmail: null };
const initialResendState: ResendConfirmationState = { error: null, resent: false };

/**
 * Shown when signUp created the account but returned no session — email
 * confirmation is enabled and the user's next step is in their inbox, not
 * here. Explains what happens next and offers a resend.
 */
function CheckYourEmail({ email }: { email: string }) {
  const [resendState, resendAction, resendPending] = useActionState(
    resendConfirmationEmail,
    initialResendState,
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center">
        <p className="text-sm font-medium text-zinc-900">Check your email</p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          We sent a confirmation link to{" "}
          <span className="font-medium text-zinc-900">{email}</span>. Click it
          to activate your account — it will bring you straight back here,
          signed in and ready to start.
        </p>
      </div>

      <form action={resendAction} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={email} />
        {resendState.resent ? (
          <p role="status" className="text-center text-sm text-zinc-600">
            Sent again — give it a minute to arrive.
          </p>
        ) : (
          <button
            type="submit"
            disabled={resendPending}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {resendPending ? "Resending…" : "Resend email"}
          </button>
        )}
        {resendState.error ? (
          <p className="text-center text-sm text-red-600" role="alert">
            {resendState.error}
          </p>
        ) : null}
      </form>

      <p className="text-center text-sm text-zinc-600">
        Wrong address?{" "}
        {/* Plain anchor: a client-side Link to the current route would keep
            this form's state; a full navigation resets it to a fresh form. */}
        <a
          href="/signup"
          className="text-zinc-900 underline-offset-4 hover:underline"
        >
          Start over
        </a>
      </p>
    </div>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.pendingEmail) {
    return <CheckYourEmail email={state.pendingEmail} />;
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm text-zinc-600">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-zinc-600">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-xs leading-5 text-zinc-500">
        By creating an account you agree to the{" "}
        <Link href="/terms" className="text-zinc-700 underline-offset-4 hover:underline">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-zinc-700 underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="text-zinc-900 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
