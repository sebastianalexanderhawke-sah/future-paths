"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  children: React.ReactNode;
  /** The exact button classes the form already used — passed through. */
  className: string;
  /** Spinner treatment: "onLight" for white/outline buttons, "onDark" for
   *  filled black ones. */
  spinner?: "onLight" | "onDark";
};

/**
 * Submit button for multi-second server-action forms (AI generation:
 * forecasts, paths). Disables and leads with the product's small spinner
 * while the action runs — the same useFormStatus idiom as the Refresh
 * futures button and the entry flow's Resume button. The label never
 * changes; callers keep their existing button styling.
 */
export function PendingSubmitButton({
  children,
  className,
  spinner = "onLight",
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60 ${className}`}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className={`h-3 w-3 animate-spin rounded-full border-[1.5px] motion-reduce:animate-none ${
            spinner === "onDark"
              ? "border-white/30 border-t-white"
              : "border-[#d4d4d8] border-t-[#8b5cf6]"
          }`}
        />
      ) : null}
      {children}
    </button>
  );
}
