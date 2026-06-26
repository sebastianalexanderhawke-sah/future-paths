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
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-left text-xs text-zinc-400 transition-colors hover:text-zinc-600"
      >
        <span aria-hidden="true" className="text-[10px]">
          {expanded ? "▼" : "▶"}
        </span>
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
