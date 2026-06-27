"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  submitReflectionAnswerAction,
  type ReflectionAnswerFormState,
} from "@/actions/reflections";

type ReflectionPredictionCardProps = {
  checkInId: string;
  identityImpact: string;
};

const initialState: ReflectionAnswerFormState = { error: null };

export function ReflectionPredictionCard({
  checkInId,
  identityImpact,
}: ReflectionPredictionCardProps) {
  const [state, formAction, pending] = useActionState(
    submitReflectionAnswerAction,
    initialState,
  );
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, state.error, router]);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-5 py-4">
        <p className="text-xs text-zinc-400">Predicted reflection</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 italic">{identityImpact}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="checkInId" value={checkInId} />
        <textarea
          name="answer"
          rows={4}
          required
          maxLength={2000}
          defaultValue={identityImpact}
          placeholder="Your reflection…"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
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
          {pending ? "Saving…" : "Save reflection"}
        </button>
      </form>
    </div>
  );
}
