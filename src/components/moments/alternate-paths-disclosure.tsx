"use client";

import { useState, type ReactNode } from "react";

type AlternatePathsDisclosureProps = {
  /** The already-rendered alternate path cards (server components). */
  children: ReactNode;
};

/**
 * The alternate paths are supporting information — the page's story is the
 * path that was actually lived. They stay collapsed behind the same quiet
 * inline disclosure used elsewhere (see SummaryDisclosure /
 * AnalysisDisclosure), so a reader can finish the page without scrolling
 * through hypothetical futures, and open them only if they're curious.
 */
export function AlternatePathsDisclosure({ children }: AlternatePathsDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-9 border-t border-[#f5f5f5] pt-7">
      <h3 className="text-[15px] font-semibold text-[#111]">
        Alternate Paths You Didn&apos;t Choose
      </h3>
      <p className="mt-[3px] text-[13px] text-[#999999]">
        {open
          ? "These were realistic futures available at the time."
          : "See the other futures this decision closed off."}
      </p>

      {open ? <div className="mt-5 flex flex-col gap-4">{children}</div> : null}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mt-4 cursor-pointer text-[13px] font-medium text-[#7c3aed] transition-opacity duration-150 hover:opacity-80"
      >
        {open ? "Hide Alternate Paths" : "Explore Alternate Paths →"}
      </button>
    </div>
  );
}
