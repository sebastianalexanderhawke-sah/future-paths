"use client";

import { useId, useState } from "react";

import type { ChapterStoryline } from "@/lib/timeline-chapter-story";

type ChapterWhatChangedProps = {
  /** Already ranked most-meaningful first. */
  storylines: ChapterStoryline[];
};

const VISIBLE_ROWS = 3;

/**
 * One situation as a compact horizontal comparison — its title, then where it
 * stood entering the month beside where it stood leaving it, the arrow
 * carrying the movement. On narrow screens the two states stack and the
 * arrow turns downward. Rows divide by hairline inside the section card;
 * events only — the identity reading lives in "The Person You Were Becoming".
 */
function ComparisonRow({ storyline }: { storyline: ChapterStoryline }) {
  return (
    <div className="border-t border-[#f5f5f5] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[14px] font-bold leading-snug text-[#111]">
        {storyline.title}
      </p>

      {storyline.beginning ? (
        <div className="mt-1.5 flex flex-col gap-1 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-baseline sm:gap-3">
          <p className="text-[14px] leading-[1.55] text-[#707070]">
            {storyline.beginning}
          </p>
          <span
            aria-hidden="true"
            className="text-[13px] leading-none text-[#c9c9d1]"
          >
            <span className="hidden sm:inline">⟶</span>
            <span className="sm:hidden">↓</span>
          </span>
          <div className="flex flex-col gap-1">
            {storyline.end.map((line) => (
              <p key={line} className="text-[14px] leading-[1.55] text-[#333333]">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex max-w-[48em] flex-col gap-1">
          {storyline.end.map((line) => (
            <p key={line} className="text-[14px] leading-[1.55] text-[#333333]">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The rows of the "What Changed" section: the month's most important
 * situations as compact beginning → end comparisons. Only the top three stay
 * visible; the rest fold behind the app's primary-button disclosure so large
 * months keep the chapter readable.
 */
export function ChapterWhatChanged({ storylines }: ChapterWhatChangedProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (storylines.length === 0) {
    return null;
  }

  const visible = expanded ? storylines : storylines.slice(0, VISIBLE_ROWS);
  const hiddenCount = storylines.length - VISIBLE_ROWS;

  return (
    <div id={listId}>
      {visible.map((storyline) => (
        <ComparisonRow key={storyline.momentId} storyline={storyline} />
      ))}

      {hiddenCount > 0 ? (
        /* The app's primary action style — the same control language as the
           chapter's own Show/Close button, Workspace, and Situations. */
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((current) => !current)}
          className="mt-4 cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
        >
          {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  );
}
