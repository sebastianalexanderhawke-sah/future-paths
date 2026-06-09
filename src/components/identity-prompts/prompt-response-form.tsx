"use client";

import { useActionState } from "react";

import {
  submitIdentityPromptResponseAction,
  type IdentityPromptResponseFormState,
} from "@/actions/identity-prompts";

const initialState: IdentityPromptResponseFormState = { error: null };

type PromptResponseFormProps = {
  promptId: string;
};

export function PromptResponseForm({ promptId }: PromptResponseFormProps) {
  const [state, formAction, pending] = useActionState(
    submitIdentityPromptResponseAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="promptId" value={promptId} />

      <div className="flex flex-col gap-2">
        <label htmlFor="response" className="text-sm text-zinc-600">
          Your reflection
        </label>
        <textarea
          id="response"
          name="response"
          rows={5}
          required
          maxLength={5000}
          placeholder="Write what feels true right now — tentative answers are welcome..."
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
        {pending ? "Saving…" : "Save response"}
      </button>
    </form>
  );
}
