"use client";

import { useState } from "react";

import { TrendIndicator } from "@/components/ui/trend-indicator";
import { getMovementStory } from "@/lib/future-self-story";
import { getIdentityById } from "@/lib/identity-library";
import type { FutureSelf } from "@/types/database";

export type FutureCardAccent = {
  color: string;
  soft: string;
};

type FutureCardProps = {
  futureSelf: FutureSelf;
  /**
   * The branch accent this future wears in the tree that opened it. Falls
   * back to a quiet neutral when rendered outside a branch context.
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
 * The identity profile: a character introduction, not a report. It answers
 * four questions in a fixed order — who is this person (name + the
 * archetype's timeless identity statement), has this future changed (the
 * movement since the last update, receipts behind a quiet toggle), what
 * kind of person are they (behaviors and trade-offs, side by side), and
 * where does this path ultimately lead (the narrative, deliberately last:
 * the emotional conclusion).
 *
 * The identity statement is hand-written in the archetype library and never
 * changes between renders or regenerations; the narrative is AI-authored
 * and owns the future tense. Faded futures lead with FadedFutureCard, which
 * preserves this card behind its "View original Future Self" reveal.
 */
export function FutureCard({ futureSelf, accent }: FutureCardProps) {
  const tone = accent ?? NEUTRAL_ACCENT;
  const pct = Math.max(0, Math.min(100, futureSelf.percentage));
  const movement = getMovementStory(futureSelf);
  const identityStatement = futureSelf.identity_id
    ? getIdentityById(futureSelf.identity_id)?.identity_statement
    : undefined;

  // The receipts behind "What's changed": the recorded behavior that moved
  // this future when the pipeline attributed any, otherwise the situations,
  // check-ins, and reflections that support it. Hidden until asked for —
  // the default reading stays calm.
  const [showEvidence, setShowEvidence] = useState(false);
  const receipts =
    movement && movement.evidence.length > 0
      ? movement.evidence
      : getEvidence(futureSelf);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
      {/* Accent band: the profile carries the color of the branch it grew
          from. */}
      <div aria-hidden="true" className="h-1" style={{ background: tone.color }} />

      <div className="p-8 sm:px-10 sm:py-9">
        {/* 1 — Who is this person? Name in the product's serif voice, then
            the archetype's timeless one-line answer. */}
        <header className="flex items-center gap-5">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{ background: tone.soft }}
          >
            <BranchGlyph color={tone.color} className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h3 className="font-voice text-[28px] font-medium leading-tight tracking-[-0.01em] text-zinc-900">
              {futureSelf.name}
            </h3>
            {identityStatement ? (
              <p className="font-voice mt-1.5 text-[15px] italic leading-snug text-zinc-500">
                “{identityStatement}”
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-zinc-500">
                {futureSelf.evidence_strength}
              </p>
            )}
          </div>
        </header>

        {/* Likelihood: one quiet line — the same signal the tree encodes as
            branch reach, restated in the branch's own color. */}
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
            {identityStatement ? (
              <span className="ml-1.5 text-zinc-400">· {futureSelf.evidence_strength}</span>
            ) : null}
          </p>
        </div>

        {/* 2 — Has this future changed? The movement and one grounded
            sentence; the receipts wait behind a quiet inline action. */}
        {movement ? (
          <div className="mt-8">
            <SectionLabel>What&apos;s changed</SectionLabel>
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-zinc-600">
              <span
                className={`font-semibold tabular-nums ${
                  movement.direction === "up" ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {movement.headline}
              </span>
              {" — "}
              {movement.lead}
            </p>
            {receipts.length > 0 ? (
              <div className="mt-3">
                {showEvidence ? (
                  <ul className="mb-3 max-w-[60ch] space-y-1.5">
                    {receipts.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600"
                      >
                        <span aria-hidden="true" className="mt-0.5 shrink-0 text-zinc-300">
                          —
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  aria-expanded={showEvidence}
                  onClick={() => setShowEvidence((current) => !current)}
                  className="cursor-pointer text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
                >
                  {showEvidence ? "Hide supporting evidence" : "View supporting evidence →"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 3 — What kind of person are they? Behaviors and trade-offs, side
            by side: these define the identity itself. */}
        <div className="mt-9 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {futureSelf.core_behaviors.length > 0 ? (
            <div>
              <SectionLabel>Core behaviors</SectionLabel>
              <ul className="mt-3 max-w-[60ch] space-y-2">
                {/* Capped at 4 so the profile doesn't read as 5 strengths
                    against a couple of trade-offs. */}
                {futureSelf.core_behaviors.slice(0, 4).map((behavior) => (
                  <li
                    key={behavior}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600"
                  >
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
          ) : null}

          {/* Risks keep neutral markers: they aren't part of the branch's
              color story. */}
          {futureSelf.blind_spots.length > 0 ? (
            <div>
              <SectionLabel>What You Risk</SectionLabel>
              <ul className="mt-3 max-w-[60ch] space-y-2">
                {futureSelf.blind_spots.map((spot) => (
                  <li
                    key={spot}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300"
                    />
                    {spot}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* 4 — Where does this path ultimately lead? The narrative closes
            the profile, set in the serif voice: the emotional conclusion,
            deliberately the last thing read. */}
        {futureSelf.likely_evolution ? (
          <div className="mt-9">
            <SectionLabel>Where this is heading</SectionLabel>
            <p className="font-voice mt-3 max-w-[58ch] text-[17px] leading-[1.65] text-zinc-800">
              {futureSelf.likely_evolution}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
