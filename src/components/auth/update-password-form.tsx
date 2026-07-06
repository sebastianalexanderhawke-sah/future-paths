"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  updatePassword,
  type UpdatePasswordFormState,
} from "@/actions/auth";

const initialState: UpdatePasswordFormState = { error: null, updated: false };

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  if (state.updated) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-6">
          <p className="text-sm font-medium text-zinc-900">Password updated</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            You&rsquo;re signed in with your new password. Everything is where
            you left it.
          </p>
        </div>
        <Link
          href="/overview"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Back to your Overview
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-zinc-600">
          New password
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

      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="text-sm text-zinc-600">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
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
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
