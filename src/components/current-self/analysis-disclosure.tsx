"use client";

import { useState } from "react";

type AnalysisDisclosureProps = {
  /** Remaining essay paragraphs, revealed on demand under the summary. */
  paragraphs: string[];
};

export function AnalysisDisclosure({ paragraphs }: AnalysisDisclosureProps) {
  const [open, setOpen] = useState(false);

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
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
        {open ? "Hide full analysis" : "Read full analysis →"}
      </button>
    </div>
  );
}
