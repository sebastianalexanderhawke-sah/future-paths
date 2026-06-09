"use client";

import { useActionState } from "react";

import {
  createAlternateSelfAction,
  type AlternateSelfFormState,
} from "@/actions/alternate-selves";

const initialState: AlternateSelfFormState = { error: null };

export function AlternateSelfForm() {
  const [state, formAction, pending] = useActionState(
    createAlternateSelfAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="decisionTitle" className="text-sm text-zinc-600">
          Significant past decision
        </label>
        <input
          id="decisionTitle"
          name="decisionTitle"
          type="text"
          required
          maxLength={200}
          placeholder="Should I have moved to another city?"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        />
        <p className="text-xs text-zinc-400">
          A crossroad from your past — not a moment you are actively living now.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="chosenPath" className="text-sm text-zinc-600">
          Chosen path — what happened
        </label>
        <textarea
          id="chosenPath"
          name="chosenPath"
          rows={4}
          required
          maxLength={5000}
          placeholder="I stayed where I was, built stability, and invested in the life I already had..."
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="unchosenPath" className="text-sm text-zinc-600">
          Unchosen path — what almost happened
        </label>
        <textarea
          id="unchosenPath"
          name="unchosenPath"
          rows={4}
          required
          maxLength={5000}
          placeholder="I might have moved, explored a new city, and leaned into independence..."
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
        {pending ? "Exploring…" : "Explore alternate self"}
      </button>
    </form>
  );
}
