"use client";

import { useActionState } from "react";

import {
  createPastCrossroadAction,
  type PastCrossroadFormState,
} from "@/actions/alternate-selves";

const initialState: PastCrossroadFormState = { error: null };

export function PastCrossroadForm() {
  const [state, formAction, pending] = useActionState(
    createPastCrossroadAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="whatHappened" className="text-sm text-zinc-600">
          What happened?
        </label>
        <textarea
          id="whatHappened"
          name="whatHappened"
          rows={4}
          required
          maxLength={5000}
          placeholder="I attended a local university close to home."
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        />
        <p className="text-xs text-zinc-400">
          Describe the path you actually took — the decision that already happened.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="whyChosen" className="text-sm text-zinc-600">
          Why did you choose it? (optional)
        </label>
        <textarea
          id="whyChosen"
          name="whyChosen"
          rows={3}
          maxLength={1000}
          placeholder="Staying near family felt safer at the time."
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lifeStage" className="text-sm text-zinc-600">
          Approximate age / life stage (optional)
        </label>
        <input
          id="lifeStage"
          name="lifeStage"
          type="text"
          maxLength={1000}
          placeholder="19, or early twenties"
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
        {pending ? "Saving…" : "Create past crossroad"}
      </button>
    </form>
  );
}
