"use client";

import { useState } from "react";

import type { ReflectionCheckIn } from "@/lib/reflections";
import { OverviewCard } from "@/components/overview/overview-card";

const RECENT_COUNT = 5;

type CompletedReflectionsListProps = {
  checkIns: ReflectionCheckIn[];
};

// The one primary action of this section, in the app's black-button language.
// The same button expands and collapses so the interaction stays consistent.
const primaryButtonClass =
  "shrink-0 rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]";

// Same overflow voice as Coming Up ("Show N more →") — one design language.
const expanderButtonClass =
  "cursor-pointer self-start text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#047857]";

// A memory card: each finished reflection distinct inside the section's white
// bubble — bordered, no shadow, so it nests instead of competing with the
// section card. The header mirrors the queue rows (chip · bold title · gray
// meta) so Completed speaks the same language as Next Up and Coming Up.
// Hierarchy inside is fixed — the user's answer is the artifact and gets the
// darkest ink; the prediction is a quiet footnote of what Reflection expected
// before they answered.
function ReflectionMemoryCard({ checkIn }: { checkIn: ReflectionCheckIn }) {
  return (
    <article className="rounded-xl border border-[#f0f0f2] bg-white px-6 py-5">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-[15px] font-semibold text-[#047857]"
        >
          ✓
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold text-[#111]">
            {checkIn.moment.title}
          </span>
          <span className="mt-0.5 block text-[12px] text-[#888888]">
            Reflection · {new Date(checkIn.created_at).toLocaleDateString()}
          </span>
        </span>
      </div>
      <p className="mt-3.5 text-[13px] font-medium text-[#888888]">
        {checkIn.reflection_question}
      </p>
      {checkIn.reflection_answer ? (
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#111]">
          {checkIn.reflection_answer}
        </p>
      ) : null}
      <p className="mt-3 border-l-2 border-[#ececec] pl-3 text-[12px] leading-relaxed text-[#999999]">
        Expected · {checkIn.identity_impact}
      </p>
    </article>
  );
}

export function CompletedReflectionsList({ checkIns }: CompletedReflectionsListProps) {
  const [open, setOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const recent = checkIns.slice(0, RECENT_COUNT);
  const older = checkIns.slice(RECENT_COUNT);

  // One white bubble, like every other Workspace section. The header row
  // stays put in both states; expanding grows the same card downward.
  return (
    <OverviewCard className="px-8 py-6">
      <div className="flex flex-col items-start gap-4">
        <p className="text-[13px] text-[#999999]">
          Every question you&apos;ve answered, newest first
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={primaryButtonClass}
        >
          {open ? "Hide completed reflections" : "View completed reflections"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 flex flex-col gap-4">
          {recent.map((checkIn) => (
            <ReflectionMemoryCard key={checkIn.id} checkIn={checkIn} />
          ))}
          {older.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setArchiveOpen((o) => !o)}
                className={expanderButtonClass}
              >
                {archiveOpen ? "↑ Show fewer" : `Show ${older.length} more →`}
              </button>
              {archiveOpen
                ? older.map((checkIn) => (
                    <ReflectionMemoryCard key={checkIn.id} checkIn={checkIn} />
                  ))
                : null}
            </>
          ) : null}
        </div>
      ) : null}
    </OverviewCard>
  );
}
