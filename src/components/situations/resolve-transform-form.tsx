"use client";

import { useActionState, useState } from "react";

import {
  resolveAndTransformAction,
  type ResolveTransformFormState,
} from "@/actions/moments";

const initialState: ResolveTransformFormState = { error: null };

export function ResolveTransformForm({ momentId }: { momentId: string }) {
  const [state, formAction, pending] = useActionState(
    resolveAndTransformAction,
    initialState,
  );

  // Idempotency token, same pattern as the check-in form: stable while the
  // form is open, so a resubmit after a dropped connection recovers the new
  // situation the server already created instead of creating a duplicate.
  const [clientToken] = useState(() =>
    typeof window === "undefined" ? "" : crypto.randomUUID(),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="momentId" value={momentId} />
      <input
        type="hidden"
        name="clientToken"
        value={clientToken}
        suppressHydrationWarning
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="newTitle" className="text-sm font-medium text-zinc-700">
          What is the new situation?
        </label>
        <input
          id="newTitle"
          name="newTitle"
          type="text"
          required
          maxLength={200}
          placeholder="Name what you're stepping into…"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400"
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
        className="self-start rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white disabled:opacity-50"
      >
        {pending ? "Opening new situation…" : "Close this, open the next"}
      </button>
    </form>
  );
}
