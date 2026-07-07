import { TrendIndicator } from "@/components/ui/trend-indicator";
import type { FutureSelf } from "@/types/database";

export type FutureCardAccent = {
  color: string;
  soft: string;
};

type FutureCardProps = {
  futureSelf: FutureSelf;
  /**
   * The branch accent this future wears in the tree that opened it. Faded
   * futures (rendered in a plain list, not from a branch) omit it and fall
   * back to a quiet neutral.
   */
  accent?: FutureCardAccent;
};

const NEUTRAL_ACCENT: FutureCardAccent = { color: "#71717a", soft: "#f4f4f5" };

/**
 * Returns everything that contributed to this identity — situations,
 * reflections, and check-ins all flow through moments, so supporting
 * situation titles cover all three sources.
 *
 * New-pipeline rows carry real situation titles in supporting_situations.
 * Legacy rows fall back to behavioral_evidence text so nothing disappears.
 */
function getEvidence(futureSelf: FutureSelf): string[] {
  if (futureSelf.supporting_situations?.length) {
    return futureSelf.supporting_situations
      .flatMap((s) => {
        const title = (s as Record<string, unknown>).momentTitle;
        return typeof title === "string" ? [title] : [];
      })
      .slice(0, 5);
  }
  return futureSelf.behavioral_evidence.slice(0, 5);
}

/** A branch splitting in two — the product's one gesture, in miniature. */
function BranchGlyph({ color, className }: { color: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 20 V13 M12 13 Q 12 9 7.5 6.5 M12 13 Q 12 9 16.5 6.5"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={7.5} cy={6.5} r={1.8} fill={color} />
      <circle cx={16.5} cy={6.5} r={1.8} fill={color} />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
      {children}
    </p>
  );
}

/**
 * The identity profile: how a Future Self introduces itself when its branch
 * is selected. Reads top-down as a meeting, not a document — who this is
 * (name in the product's serif voice), how established it is (one quiet
 * line), where it's heading (the narrative), what they do and what it
 * costs. The evidence record stays folded behind a disclosure so the first
 * screen is entirely about the identity, and the profile fits without
 * scrolling for nearly everyone.
 */
export function FutureCard({ futureSelf, accent }: FutureCardProps) {
  const isFaded = futureSelf.status === "faded";
  const evidence = getEvidence(futureSelf);
  const tone = accent ?? NEUTRAL_ACCENT;
  const pct = Math.max(0, Math.min(100, futureSelf.percentage));

  const coreBehaviors = (
    // Capped at 4 so the profile doesn't read as 5 strengths against a
    // couple of trade-offs.
    futureSelf.core_behaviors.length > 0 ? (
      <div className={isFaded ? "mt-6" : "mt-9"}>
        <SectionLabel>Core behaviors</SectionLabel>
        <ul className="mt-3 max-w-[60ch] space-y-2">
          {futureSelf.core_behaviors.slice(0, 4).map((behavior) => (
            <li key={behavior} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600">
              <span
                aria-hidden="true"
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: tone.color, opacity: 0.45 }}
              />
              {behavior}
            </li>
          ))}
        </ul>
      </div>
    ) : null
  );

  // Risks keep neutral markers: they aren't part of the branch's color story.
  const risks =
    futureSelf.blind_spots.length > 0 ? (
      <div className={isFaded ? "mt-6" : "mt-9"}>
        <SectionLabel>What You Risk</SectionLabel>
        <ul className="mt-3 max-w-[60ch] space-y-2">
          {futureSelf.blind_spots.map((spot) => (
            <li key={spot} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600">
              <span
                aria-hidden="true"
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300"
              />
              {spot}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  // Evidence is the record, not the person: it waits behind a quiet
  // disclosure so the first screen stays entirely about the identity, and
  // curious readers can open the receipts.
  const evidenceSection =
    evidence.length > 0 ? (
      <details
        className={`group border-t border-zinc-100 pt-2 ${isFaded ? "mt-6" : "mt-9"}`}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-[13px] font-medium text-zinc-400 transition-colors duration-150 hover:text-zinc-600 [&::-webkit-details-marker]:hidden">
          <span>Evidence behind this future ({evidence.length})</span>
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          >
            <path
              d="M4 6.5 L8 10.5 L12 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <ul className="mt-1 max-w-[60ch] space-y-2 pb-1">
          {evidence.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600">
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-zinc-300">
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      </details>
    ) : null;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-zinc-100 bg-white ${
        isFaded ? "opacity-60" : ""
      }`}
    >
      {/* Accent band: the profile carries the color of the branch it grew
          from. */}
      {!isFaded ? (
        <div aria-hidden="true" className="h-1" style={{ background: tone.color }} />
      ) : null}

      <div className={isFaded ? "p-6" : "p-8 sm:px-10 sm:py-9"}>
        {/* Identity: the first and heaviest thing — glyph and name in the
            product's serif voice, like being introduced to someone. */}
        <header className="flex items-center gap-5">
          <span
            aria-hidden="true"
            className={`flex shrink-0 items-center justify-center rounded-full ${
              isFaded ? "h-10 w-10" : "h-16 w-16"
            }`}
            style={{ background: tone.soft }}
          >
            <BranchGlyph color={tone.color} className={isFaded ? "h-5 w-5" : "h-7 w-7"} />
          </span>
          <div className="min-w-0">
            <h3
              className={
                isFaded
                  ? "text-[15px] font-bold leading-snug text-zinc-900"
                  : "font-voice text-[28px] font-medium leading-tight tracking-[-0.01em] text-zinc-900"
              }
            >
              {futureSelf.name}
            </h3>
            {isFaded ? (
              <p className="mt-0.5 text-xs text-zinc-400">Faded</p>
            ) : (
              <p className="mt-1 text-[13px] text-zinc-500">
                {futureSelf.evidence_strength}
              </p>
            )}
          </div>
        </header>

        {/* Likelihood: one quiet line — the same signal the tree encodes as
            branch reach, restated in the branch's own color. */}
        {!isFaded ? (
          <div className="mt-8 flex items-center gap-4">
            <SectionLabel>Likelihood</SectionLabel>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100"
              role="img"
              aria-label={`${pct} percent likely`}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: tone.color }}
              />
            </div>
            <p className="shrink-0 text-[13px] text-zinc-500">
              <span className="font-semibold tabular-nums text-zinc-900">{pct}%</span>
              <TrendIndicator futureSelf={futureSelf} className="ml-1.5 text-xs font-medium" />
            </p>
          </div>
        ) : null}

        {/* The narrative — where this identity leads if it keeps
            strengthening — set in the serif voice, like the person
            introducing themselves. Hidden when faded (a faded identity
            isn't strengthening). */}
        {futureSelf.likely_evolution && !isFaded ? (
          <div className="mt-8">
            <SectionLabel>Where this is heading</SectionLabel>
            <p className="font-voice mt-3 max-w-[58ch] text-[17px] leading-[1.65] text-zinc-800">
              {futureSelf.likely_evolution}
            </p>
          </div>
        ) : null}

        {/* Who this person is — behaviors, then trade-offs — read at an
            unhurried single-column pace. The evidence record closes the
            profile, folded away until asked for. */}
        {coreBehaviors}
        {risks}
        {evidenceSection}
      </div>
    </article>
  );
}
