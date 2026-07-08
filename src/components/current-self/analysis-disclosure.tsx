"use client";

import { useState } from "react";

type AnalysisDisclosureProps = {
  /** The deeper portrait paragraphs shown after the hero's lead observation. */
  paragraphs: string[];
};

// The deeper written portrait lives behind "Read Full Portrait" so the hero
// stays a single memorable observation. Collapsed by default; renders nothing
// when the lead observation already covers the whole portrait.
export function AnalysisDisclosure({ paragraphs }: AnalysisDisclosureProps) {
  const [open, setOpen] = useState(false);

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-[#f0f0f0] pt-5">
      {open ? (
        <div className="mb-3 flex flex-col gap-3">
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="max-w-[52em] text-[14px] leading-[1.7] text-[#777777]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="cursor-pointer text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
      >
        {open ? "Hide Full Portrait" : "Read Full Portrait →"}
      </button>
    </div>
  );
}
