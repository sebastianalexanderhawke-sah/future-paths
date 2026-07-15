"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button for the page-header "Refresh futures" form. Generation is a
 * multi-second server action (personalization may invoke the AI), so the
 * button reports its pending state instead of sitting inert — the same
 * useFormStatus idiom the situation entry flow's Resume button uses.
 *
 * Styling is the platform's quiet secondary button (the Overview's "+ New
 * situation" treatment): the BranchMap is this page's hero, and a filled
 * black header action competed with both the heading and the map. While
 * pending it disables and leads with the product's small spinner — the
 * label itself never changes.
 */
export function RefreshFuturesButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-[#ececf0] bg-white px-[18px] py-2.5 text-[13px] font-semibold text-[#333333] transition-colors duration-150 hover:bg-[#f5f5f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-white"
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-[#d4d4d8] border-t-[#8b5cf6] motion-reduce:animate-none"
        />
      ) : null}
      Refresh futures
    </button>
  );
}
