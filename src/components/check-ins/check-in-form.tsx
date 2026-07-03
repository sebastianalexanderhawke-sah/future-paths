"use client";

import { useActionState } from "react";

import {
  createCheckInAction,
  type CheckInFormState,
} from "@/actions/check-ins";

const initialState: CheckInFormState = { error: null };

type CheckInFormProps = {
  momentId: string;
  onBeforeSubmit?: () => void;
};

export function CheckInForm({ momentId, onBeforeSubmit }: CheckInFormProps) {
  const [state, formAction, pending] = useActionState(
    createCheckInAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={() => onBeforeSubmit?.()}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="momentId" value={momentId} />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="reflection"
          className="text-[13px] font-medium text-[#666666]"
        >
          What actually happened?
        </label>
        <textarea
          id="reflection"
          name="reflection"
          rows={6}
          required
          maxLength={5000}
          placeholder="Describe the outcome, what shifted, or what you noticed..."
          className="rounded-xl border border-[#ececf0] bg-white px-4 py-3 text-[14px] leading-[1.6] text-[#111] outline-none transition-colors duration-150 placeholder:text-[#bbbbbb] focus:border-[#6366f1]"
        />
      </div>

      {state.error ? (
        <p className="text-[13px] text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88] disabled:opacity-50"
      >
        {pending ? "Recording…" : "Record check-in"}
      </button>
    </form>
  );
}
