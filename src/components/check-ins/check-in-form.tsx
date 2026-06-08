"use client";

import { useActionState } from "react";

import {
  createCheckInAction,
  type CheckInFormState,
} from "@/actions/check-ins";

const initialState: CheckInFormState = { error: null };

type CheckInFormProps = {
  momentId: string;
};

export function CheckInForm({ momentId }: CheckInFormProps) {
  const [state, formAction, pending] = useActionState(
    createCheckInAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="momentId" value={momentId} />

      <div className="flex flex-col gap-2">
        <label htmlFor="reflection" className="text-sm text-zinc-600">
          What actually happened?
        </label>
        <textarea
          id="reflection"
          name="reflection"
          rows={4}
          required
          maxLength={5000}
          placeholder="Describe the outcome, what shifted, or what you noticed..."
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
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Recording…" : "Record check-in"}
      </button>
    </form>
  );
}
