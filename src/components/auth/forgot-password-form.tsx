"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordReset,
  type PasswordResetRequestState,
} from "@/actions/auth";

const initialState: PasswordResetRequestState = { error: null, sent: false };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.sent) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6">
          <p className="text-sm font-medium text-zinc-900">Check your email</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            If an account exists for that address, a password reset link is on
            its way. The link takes you straight to a page where you can choose
            a new password.
          </p>
        </div>
        <p className="text-center text-sm text-zinc-600">
          Remembered it after all?{" "}
          <Link
            href="/login"
            className="text-zinc-900 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
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
        {pending ? "Sending link…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-zinc-600">
        <Link
          href="/login"
          className="text-zinc-900 underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
