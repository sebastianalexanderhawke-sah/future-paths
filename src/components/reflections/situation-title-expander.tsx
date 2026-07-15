"use client";

import { useState } from "react";

type SituationTitleExpanderProps = {
  title: string;
  date: string;
  summary: string | null;
};

export function SituationTitleExpander({ title, date, summary }: SituationTitleExpanderProps) {
  const [expanded, setExpanded] = useState(false);

  if (!summary) {
    return (
      <p className="text-xs text-zinc-400">
        {title} · {date}
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
        className="flex cursor-pointer items-center gap-1.5 rounded-md text-left text-xs text-zinc-400 transition-colors hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2"
      >
        {/* The platform's one disclosure mark — a turning chevron, not
            text-glyph arrows. */}
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
            expanded ? "" : "-rotate-90"
          }`}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{title}</span>
        <span aria-hidden="true">·</span>
        <span>{date}</span>
      </button>
      {expanded ? (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{summary}</p>
      ) : null}
    </div>
  );
}
