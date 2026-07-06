"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  submitReflectionAnswerAction,
  type ReflectionAnswerFormState,
} from "@/actions/reflections";

type ReflectionPredictionCardProps = {
  checkInId: string;
};

const initialState: ReflectionAnswerFormState = { error: null };

export function ReflectionPredictionCard({
  checkInId,
}: ReflectionPredictionCardProps) {
  const [state, formAction, pending] = useActionState(
    submitReflectionAnswerAction,
    initialState,
  );
  const router = useRouter();
  const wasPending = useRef(false);

  // Controlled so the user's writing survives a failed submission (React
  // resets uncontrolled fields after a form action completes, error or not).
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setAnswer("");
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, state.error, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="checkInId" value={checkInId} />
      <textarea
        name="answer"
        rows={4}
        required
        maxLength={2000}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        placeholder="Write whatever comes to mind."
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
  );
}
