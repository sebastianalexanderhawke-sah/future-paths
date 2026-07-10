"use client";

import { useState } from "react";

const MIN_PREVIEW_SENTENCES = 3;
const MAX_PREVIEW_SENTENCES = 4;

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["')\]]*\s*/g) ?? [text];
}

type SummaryDisclosureProps = {
  /** The full, unmodified understanding text. */
  text: string;
};

/**
 * Shows roughly the first three to four sentences (about half) of the
 * situation understanding, fading into "Read full summary →". Expanding
 * reveals the rest. The text itself is untouched.
 */
export function SummaryDisclosure({ text }: SummaryDisclosureProps) {
  const [open, setOpen] = useState(false);

  const sentences = splitSentences(text);
  const previewCount = Math.min(
    MAX_PREVIEW_SENTENCES,
    Math.max(MIN_PREVIEW_SENTENCES, Math.ceil(sentences.length / 2)),
  );
  const preview = sentences.slice(0, previewCount).join("").trim();
  const hasMore = sentences.length > previewCount;

  if (!hasMore) {
    return (
      <p className="mt-4 max-w-[56em] text-[14px] leading-[1.7] text-[#777777]">
        {text}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="relative">
        <p className="max-w-[56em] text-[14px] leading-[1.7] text-[#777777]">
          {open ? text : preview}
        </p>
        {!open ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-white"
          />
        ) : null}
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mt-2 cursor-pointer text-[13px] font-medium text-[#b45309] transition-opacity duration-150 hover:opacity-80"
      >
        {open ? "Hide full summary" : "Read full summary →"}
      </button>
    </div>
  );
}
