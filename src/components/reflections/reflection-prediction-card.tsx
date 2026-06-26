"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  submitReflectionAnswerAction,
  type ReflectionAnswerFormState,
} from "@/actions/reflections";

type Mode = "choosing" | "editing";

type ReflectionPredictionCardProps = {
  checkInId: string;
  identityImpact: string;
};

const initialState: ReflectionAnswerFormState = { error: null };

export function ReflectionPredictionCard({
  checkInId,
  identityImpact,
}: ReflectionPredictionCardProps) {
  const [mode, setMode] = useState<Mode>("choosing");
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

  const predictionBlock = (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-5 py-4">
      <p className="text-xs text-zinc-400">Based on your recent check-in…</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">We think you'd answer:</p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-800">{identityImpact}</p>
    </div>
  );

  if (mode === "choosing") {
    return (
      <div className="flex flex-col gap-5">
        {predictionBlock}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500">Did we get this right?</p>

          <form action={formAction} className="contents">
            <input type="hidden" name="checkInId" value={checkInId} />
            <input type="hidden" name="answer" value={identityImpact} />
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
            >
              <span className="text-base">✓</span>
              <span>Yes, that&apos;s close</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode("editing")}
            className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
          >
            <span className="text-base">✏</span>
            <span>Edit answer</span>
          </button>

          {state.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {predictionBlock}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="checkInId" value={checkInId} />
        <textarea
          name="answer"
          rows={5}
          required
          maxLength={2000}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          defaultValue={identityImpact}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
        />

        {state.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save reflection"}
          </button>
          <button
            type="button"
            onClick={() => setMode("choosing")}
            className="text-sm text-zinc-400 hover:text-zinc-600"
          >
            ← Back
          </button>
        </div>
      </form>
    </div>
  );
}
