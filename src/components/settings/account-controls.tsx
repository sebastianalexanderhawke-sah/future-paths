"use client";

import { useActionState } from "react";

import { updatePassword, type UpdatePasswordFormState } from "@/actions/auth";
import {
  requestEmailChange,
  updateDisplayName,
  type DisplayNameFormState,
  type EmailChangeFormState,
} from "@/actions/settings";

const inputClassName =
  "w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#111] outline-none placeholder:text-[#bbbbbb] focus:border-[#999999]";

const buttonClassName =
  "shrink-0 rounded-lg bg-[#111] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50";

const labelClassName = "text-[14px] font-medium text-[#111]";
const helpClassName = "mt-1 text-[13px] leading-[1.6] text-[#999999]";

function StatusLine({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (error) {
    return (
      <p role="alert" className="mt-2 text-[13px] text-red-600">
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p role="status" className="mt-2 text-[13px] text-emerald-700">
        {success}
      </p>
    );
  }

  return null;
}

const initialDisplayNameState: DisplayNameFormState = { error: null, saved: false };

export function DisplayNameForm({ currentName }: { currentName: string | null }) {
  const [state, formAction, pending] = useActionState(
    updateDisplayName,
    initialDisplayNameState,
  );

  return (
    <form action={formAction} className="py-3.5">
      <label htmlFor="displayName" className={labelClassName}>
        Display name
      </label>
      <p className={helpClassName}>
        How Reflection greets you. Leave it blank to go without one.
      </p>
      <div className="mt-2.5 flex items-center gap-2.5">
        <input
          id="displayName"
          name="displayName"
          type="text"
          maxLength={60}
          defaultValue={currentName ?? ""}
          placeholder="Your name"
          className={inputClassName}
        />
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <StatusLine error={state.error} success={state.saved ? "Saved." : null} />
    </form>
  );
}

const initialEmailState: EmailChangeFormState = { error: null, pendingEmail: null };

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState(
    requestEmailChange,
    initialEmailState,
  );

  return (
    <form action={formAction} className="border-t border-[#f0f0f0] py-3.5">
      <label htmlFor="email" className={labelClassName}>
        Email address
      </label>
      <p className={helpClassName}>
        Currently <span className="text-[#555555]">{currentEmail}</span>. Changing
        it sends a confirmation link — the switch happens only after you click it.
      </p>
      <div className="mt-2.5 flex items-center gap-2.5">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="new@email.com"
          className={inputClassName}
        />
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? "Sending…" : "Change"}
        </button>
      </div>
      <StatusLine
        error={state.error}
        success={
          state.pendingEmail
            ? `Confirmation sent to ${state.pendingEmail} — check that inbox to finish.`
            : null
        }
      />
    </form>
  );
}

const initialPasswordState: UpdatePasswordFormState = { error: null, updated: false };

export function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialPasswordState,
  );

  return (
    <form action={formAction} className="py-3.5">
      <span className={labelClassName}>Password</span>
      <p className={helpClassName}>
        At least 8 characters. You stay signed in after changing it.
      </p>
      <div className="mt-2.5 flex flex-col gap-2.5">
        <label htmlFor="settings-new-password" className="sr-only">
          New password
        </label>
        <input
          id="settings-new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="New password"
          className={inputClassName}
        />
        <div className="flex items-center gap-2.5">
          <label htmlFor="settings-confirm-password" className="sr-only">
            Confirm new password
          </label>
          <input
            id="settings-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Confirm new password"
            className={inputClassName}
          />
          <button type="submit" disabled={pending} className={buttonClassName}>
            {pending ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
      <StatusLine
        error={state.error}
        success={state.updated ? "Password updated." : null}
      />
    </form>
  );
}
