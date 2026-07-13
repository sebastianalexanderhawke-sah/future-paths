"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  submitReflectionAnswerAction,
  type ReflectionAnswerFormState,
} from "@/actions/reflections";
import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

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

  // Controlled so the user's writing survives a failed submission (React
  // resets uncontrolled fields after a form action completes, error or not).
  // Cleared on success so the answer never lingers if this form stays mounted.
  const [answer, setAnswer] = useState("");
  const wasPending = useRef(false);

  // "Started" = the first keystroke of an answer, once per mount — the
  // moment intent becomes action, not merely seeing the question.
  const startedFired = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setAnswer("");
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="checkInId" value={checkInId} />
      <textarea
        name="answer"
        rows={3}
        required
        maxLength={2000}
        value={answer}
        onChange={(event) => {
          if (!startedFired.current) {
            startedFired.current = true;
            trackEvent(ANALYTICS_EVENTS.reflectionStarted, {
              check_in_id: checkInId,
            });
          }
          setAnswer(event.target.value);
        }}
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
