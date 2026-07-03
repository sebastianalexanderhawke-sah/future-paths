"use client";

import { useState } from "react";

const PREVIEW_SENTENCES = 3;

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["')\]]*\s*/g) ?? [text];
}

type SummaryDisclosureProps = {
  /** The full, unmodified understanding text. */
  text: string;
};

/**
 * Shows roughly the first three sentences of the situation understanding,
 * with the remainder behind "Read full summary →" — the same disclosure
 * pattern used on Current Self and Timeline. The text itself is untouched.
 */
export function SummaryDisclosure({ text }: SummaryDisclosureProps) {
  const [open, setOpen] = useState(false);

  const sentences = splitSentences(text);
  const preview = sentences.slice(0, PREVIEW_SENTENCES).join("").trim();
  const hasMore = sentences.length > PREVIEW_SENTENCES;

  if (!hasMore) {
    return (
      <p className="mt-4 max-w-[56em] text-[14px] leading-[1.7] text-[#777777]">
        {text}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="max-w-[56em] text-[14px] leading-[1.7] text-[#777777]">
        {open ? text : preview}
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mt-3 cursor-pointer text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
      >
        {open ? "Hide full summary" : "Read full summary →"}
      </button>
    </div>
  );
}
