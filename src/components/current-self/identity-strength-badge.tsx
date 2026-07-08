import type { IdentityConfidenceLevel } from "@/lib/current-self-hero";

type IdentityStrengthBadgeProps = {
  level: IdentityConfidenceLevel;
  label: string;
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

// Compact identity-strength badge sitting inline beside the portrait title,
// e.g. "● Strong Signal". Pure metadata — no tooltip, no interaction; the
// "Why this identity?" section below the fold carries the explanation.
export function IdentityStrengthBadge({ level, label }: IdentityStrengthBadgeProps) {
  const style = LEVEL_STYLES[level];

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
        style.bg,
        style.text,
      ].join(" ")}
    >
      <span aria-hidden="true" className={["h-2 w-2 rounded-full", style.dot].join(" ")} />
      {label} Signal
    </span>
  );
}
