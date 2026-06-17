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

  if (mode === "create") {
    return (
      <form action={formAction} className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-3">
          <label htmlFor="title" className="text-lg font-semibold text-zinc-900">
            What situation is weighing on you right now?
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            autoFocus
            maxLength={200}
            defaultValue={defaultTitle}
            placeholder="Describe it in a sentence or two…"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <details className="group">
          <summary className="cursor-pointer list-none text-sm text-zinc-400 hover:text-zinc-600 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+ Add context (optional)</span>
            <span className="hidden group-open:inline">− Hide context</span>
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="description" className="text-sm text-zinc-600">
              Any background that would help?
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              defaultValue={defaultDescription ?? ""}
              placeholder="What makes this situation meaningful right now?"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            />
          </div>
        </details>

        {state.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create situation"}
        </button>
      </form>
    );
  }

  // Edit mode — original two-field layout preserved
  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {momentId ? <input type="hidden" name="momentId" value={momentId} /> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm text-zinc-600">
          Situation
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={defaultTitle}
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
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
