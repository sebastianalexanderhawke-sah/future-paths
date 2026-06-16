"use client";

import { useActionState } from "react";

import {
  submitReflectionAnswerAction,
  type ReflectionAnswerFormState,
} from "@/actions/reflections";

const initialState: ReflectionAnswerFormState = { error: null };

type ReflectionAnswerFormProps = {
  checkInId: string;
  submitLabel?: string;
};

export function ReflectionAnswerForm({
  checkInId,
  submitLabel = "Save reflection",
}: ReflectionAnswerFormProps) {
  const [state, formAction, pending] = useActionState(
    submitReflectionAnswerAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="checkInId" value={checkInId} />
      <textarea
        name="answer"
        rows={3}
        required
        maxLength={2000}
        placeholder="Your reflection..."
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
      />

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
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
