"use client";

import { useState } from "react";

import type { IdentityConfidenceLevel } from "@/lib/current-self-hero";

type IdentityStrengthBadgeProps = {
  level: IdentityConfidenceLevel;
  label: string;
  explanation: string;
};

// Status-indicator styling per level: colored dot + colored text on a pale
// tint of the same hue. Subtle, never button-like.
const LEVEL_STYLES: Record<
  IdentityConfidenceLevel,
  { dot: string; text: string; bg: string }
> = {
  high: { dot: "bg-[#22c55e]", text: "text-[#15803d]", bg: "bg-[#f0fdf4]" },
  growing: { dot: "bg-[#d97706]", text: "text-[#b45309]", bg: "bg-[#fffbeb]" },
  early: { dot: "bg-[#ef4444]", text: "text-[#b91c1c]", bg: "bg-[#fef2f2]" },
};

// Compact identity-strength badge for the hero header. The explanation lives
// in a small tooltip behind an info icon (hover, focus, or click) so the hero
// stays clean instead of carrying a paragraph.
export function IdentityStrengthBadge({
  level,
  label,
  explanation,
}: IdentityStrengthBadgeProps) {
  const [open, setOpen] = useState(false);
  const style = LEVEL_STYLES[level];

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
          style.bg,
          style.text,
        ].join(" ")}
      >
        <span aria-hidden="true" className={["h-2 w-2 rounded-full", style.dot].join(" ")} />
        {label}
      </span>

      <div className="relative flex items-center">
        <button
          type="button"
          aria-label={`What does ${label} mean?`}
          onClick={() => setOpen((current) => !current)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border border-[#dcdce1] text-[10px] font-semibold leading-none text-[#9a9a9a] transition-colors duration-150 hover:border-[#c4c4cc] hover:text-[#777777]"
        >
          i
        </button>

        {open ? (
          <div
            role="tooltip"
            className="absolute right-0 top-[calc(100%+8px)] z-20 w-[272px] rounded-[10px] border border-[#ececf0] bg-white p-3 text-left text-[12px] font-normal leading-[1.6] text-[#555555] shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
          >
            {explanation}
          </div>
        ) : null}
      </div>
    </div>
  );
}
