import type { IdentityShift } from "@/lib/timeline-chapter-story";

/**
 * One accent per chapter, derived from the month's strongest identity shift.
 * Presentation only: the accent never encodes judgment — a slate Loneliness
 * month and an emerald Courage month use their colors identically
 * (hairlines, indicators, tier labels). Shades follow the app's semantic
 * ramp convention (globals.css): 600/500 for strong marks, 400 for muted
 * values, 200/100 for pale fills and hairlines. Headings stay in editorial
 * ink — the accent marks meaning inside a chapter, never its title.
 */
export type ChapterAccent = {
  /** 600 — strong text accents: rising values, disclosure links. */
  strong: string;
  /** 500 — solid indicators and rising bars. */
  mid: string;
  /** 400 — readable muted text for receding values. */
  muted: string;
  /** 200 — pale fills: receding bars, the closing line's rule. */
  soft: string;
  /** 100 — hairline dividers inside the hero card. */
  faint: string;
};

const FAMILIES = {
  emerald: {
    strong: "#059669",
    mid: "#10b981",
    muted: "#34d399",
    soft: "#a7f3d0",
    faint: "#d1fae5",
  },
  violet: {
    strong: "#7c3aed",
    mid: "#8b5cf6",
    muted: "#a78bfa",
    soft: "#ddd6fe",
    faint: "#ede9fe",
  },
  indigo: {
    strong: "#4f46e5",
    mid: "#6366f1",
    muted: "#818cf8",
    soft: "#c7d2fe",
    faint: "#e0e7ff",
  },
  rose: {
    strong: "#e11d48",
    mid: "#f43f5e",
    muted: "#fb7185",
    soft: "#fecdd3",
    faint: "#ffe4e6",
  },
  amber: {
    strong: "#d97706",
    mid: "#f59e0b",
    muted: "#fbbf24",
    soft: "#fde68a",
    faint: "#fef3c7",
  },
  slate: {
    strong: "#475569",
    mid: "#64748b",
    muted: "#94a3b8",
    soft: "#cbd5e1",
    faint: "#e2e8f0",
  },
} satisfies Record<string, ChapterAccent>;

type FamilyName = keyof typeof FAMILIES;

// Every check-in theme maps to a family: forward motion is emerald (the
// Timeline's growth family), agency and direction violet, mind and
// noticing indigo, people rose, groundedness amber, and the difficult
// inward themes slate — muted, never red, never a warning.
const FAMILY_BY_THEME: Record<string, FamilyName> = {
  Courage: "emerald",
  Growth: "emerald",
  Resilience: "emerald",
  Leadership: "violet",
  Independence: "violet",
  Creativity: "violet",
  Curiosity: "indigo",
  Reflection: "indigo",
  Connection: "rose",
  Belonging: "rose",
  Stability: "amber",
  Acceptance: "amber",
  Loneliness: "slate",
  Hurt: "slate",
  Grief: "slate",
  Disappointment: "slate",
  Frustration: "slate",
  Uncertainty: "slate",
};

/** Accent for one theme's indicator (shift rows, preview rows). */
export function themeAccent(theme: string): ChapterAccent {
  return FAMILIES[FAMILY_BY_THEME[theme] ?? "emerald"];
}

/**
 * The chapter's dominant accent: the family of its strongest identity shift
 * (the list arrives magnitude-sorted). Months without shift evidence fall
 * back to emerald — the Timeline's own family — so a chapter is never
 * accentless.
 */
export function chapterAccentFor(identityShifts: IdentityShift[]): ChapterAccent {
  const strongest = identityShifts[0];
  return strongest ? themeAccent(strongest.theme) : FAMILIES.emerald;
}
