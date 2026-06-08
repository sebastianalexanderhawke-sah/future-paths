"use client";

import { useActionState } from "react";

import {
  createMomentAction,
  updateMomentAction,
  type MomentFormState,
} from "@/actions/moments";

const initialState: MomentFormState = { error: null };

type MomentFormProps = {
  mode: "create" | "edit";
  momentId?: string;
  defaultTitle?: string;
  defaultDescription?: string | null;
};

export function MomentForm({
  mode,
  momentId,
  defaultTitle = "",
  defaultDescription = "",
}: MomentFormProps) {
  const action = mode === "create" ? createMomentAction : updateMomentAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {mode === "edit" && momentId ? (
        <input type="hidden" name="momentId" value={momentId} />
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm text-zinc-600">
          What decision or crossroads are you facing?
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={defaultTitle}
          placeholder="Should I move cities?"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm text-zinc-600">
          Context (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={defaultDescription ?? ""}
          placeholder="What makes this moment meaningful right now?"
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
        {pending
          ? mode === "create"
            ? "Creating…"
            : "Saving…"
          : mode === "create"
            ? "Create moment"
            : "Save changes"}
      </button>
    </form>
  );
}
