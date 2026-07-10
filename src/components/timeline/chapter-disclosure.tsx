"use client";

import { useState } from "react";

type ChapterDisclosureProps = {
  /** Remaining narrative paragraphs, revealed on demand under the preview. */
  paragraphs: string[];
};

export function ChapterDisclosure({ paragraphs }: ChapterDisclosureProps) {
  const [open, setOpen] = useState(false);

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
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
        className="cursor-pointer text-[13px] font-medium text-[#047857] transition-opacity duration-150 hover:opacity-80"
      >
        {open ? "Hide full chapter" : "Read full chapter →"}
      </button>
    </div>
  );
}
