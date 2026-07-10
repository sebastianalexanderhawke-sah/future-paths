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
 * A possible life, not a report. The card answers six questions in a fixed
 * order — who does this person slowly become (name + the future identity's
 * timeless statement), why does this life keep calling them back (the pull,
 * directly under the statement), has this future changed (the movement since
 * the last update, receipts behind a quiet toggle), who do they become (the
 * transformation itself), what do they leave behind (the interior price),
 * and why Reflection believes this (three evidence bullets) — closed not by
 * a question but by "You'll Know You're Here When...": one ordinary moment
 * the reader will recognize from inside if this future ever becomes real.
 *
 * The identity statement is hand-written in the future identity library and
 * never changes between renders or regenerations; the narrative fields are
 * AI-authored and own the future tense. why_emerging carries one evidence
 * bullet per line; growth_opportunities carries the "What keeps pulling you
 * here" sentence as its first element (v3 format — earlier rows render
 * without it until their one-time format_upgrade regeneration);
 * likely_evolution carries the recognition moment as its final line (v2–v5
 * rows carry a reflective question there instead, rendered in the legacy
 * style until their one-time regeneration). Faded futures lead with
 * FadedFutureCard, which preserves this card behind its "View original
 * Future Self" reveal.
 */
export function FutureCard({ futureSelf, accent }: FutureCardProps) {
  const tone = accent ?? NEUTRAL_ACCENT;
  const pct = Math.max(0, Math.min(100, futureSelf.percentage));
  const movement = getMovementStory(futureSelf);
  const identityStatement = futureSelf.identity_id
    ? getIdentityById(futureSelf.identity_id)?.identity_statement
    : undefined;

  // v2 narrative encoding (see explain-identity): why_emerging carries one
  // evidence bullet per line; blind_spots carries a single cost paragraph
  // (pre-v2 rows hold short risk labels — joined into terse prose until
  // their one-time format_upgrade regeneration); likely_evolution ends with
  // a final closing line when one was written.
  const evidenceBullets = futureSelf.why_emerging
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
  const costParts = futureSelf.blind_spots.map((s) => s.trim()).filter(Boolean);
  const cost = costParts.length === 1 ? costParts[0] : costParts.join(". ");
  // v3: the quiet reason this life keeps becoming more likely. Rows from the
  // identity engine only carry it after their v3 (re)generation; absent, the
  // section simply doesn't render.
  const pull = futureSelf.growth_opportunities?.map((s) => s.trim()).find(Boolean) ?? null;
  const evolutionLines = futureSelf.likely_evolution
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  // The final line is the card's closing beat. v6 rows carry the "You'll
  // Know You're Here When..." recognition moment there; v2–v5 rows carry the
  // old reflective question (always "?"-terminated — exactly what marks them
  // for regeneration), rendered in the legacy style until they regenerate.
  const closingLine = evolutionLines.length > 1 ? evolutionLines[evolutionLines.length - 1] : null;
  const legacyClosingQuestion = closingLine?.endsWith("?") ? closingLine : null;
  const recognitionMoment = closingLine && !legacyClosingQuestion ? closingLine : null;
  const narrative = (closingLine ? evolutionLines.slice(0, -1) : evolutionLines).join(" ");

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
        {/* 1 — Who does this person become? Name in the product's serif
            voice, then the future identity's timeless one-line answer. */}
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

        {/* 2 — Why does this life keep calling them back? The pull sits
            directly under the identity statement: one or two sentences of
            emotional gravity, before any numbers. */}
        {pull ? (
          <div className="mt-8">
            <SectionLabel>What keeps pulling you here</SectionLabel>
            <p className="font-voice mt-3 max-w-[58ch] text-[16px] leading-[1.65] text-zinc-700">
              {pull}
            </p>
          </div>
        ) : null}

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
                  className="cursor-pointer text-[13px] font-medium text-[#7c3aed] transition-opacity duration-150 hover:opacity-80"
                >
                  {showEvidence ? "Hide supporting evidence" : "View supporting evidence →"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 3 — Who You Become: meeting the future person — the
            transformation itself, set in the serif voice. A hairline marks
            where the status zone ends and the reading begins. */}
        {narrative ? (
          <div className="mt-9 border-t border-zinc-100 pt-8">
            <SectionLabel>Who You Become</SectionLabel>
            <p className="font-voice mt-3 max-w-[58ch] text-[17px] leading-[1.65] text-zinc-800">
              {narrative}
            </p>
          </div>
        ) : null}

        {/* 4 — What You Leave Behind: the emotional center. One quiet
            prose paragraph — what slowly changes inside the person — never a
            list of risks. Set in the serif voice like the narrative it
            balances. */}
        {cost ? (
          <div className="mt-9">
            <SectionLabel>What You Leave Behind</SectionLabel>
            <p className="font-voice mt-3 max-w-[58ch] text-[16px] leading-[1.65] text-zinc-700">
              {cost}
            </p>
          </div>
        ) : null}

        {/* 5 — Why Reflection Believes This: three recurring patterns from
            the evidence — the receipts, after the life and its price. One
            bullet per line of why_emerging (pre-v2 rows carry a single
            sentence, which renders as one bullet until regeneration). */}
        {evidenceBullets.length > 0 ? (
          <div className="mt-9">
            <SectionLabel>Why Reflection Believes This</SectionLabel>
            <ul className="mt-3 max-w-[60ch] space-y-2">
              {evidenceBullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600"
                >
                  <span
                    aria-hidden="true"
                    className="mt-px shrink-0 text-[13px] font-semibold"
                    style={{ color: tone.color, opacity: 0.7 }}
                  >
                    ✓
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 6 — You'll Know You're Here When...: the card ends on recognition,
            not interrogation — one ordinary moment the reader will live
            through if this future becomes real. */}
        {recognitionMoment ? (
          <div className="mt-9 border-t border-zinc-100 pt-8">
            <SectionLabel>{"You'll Know You're Here When..."}</SectionLabel>
            <p
              className="font-voice mt-3 max-w-[58ch] text-[17px] italic leading-[1.6]"
              style={{ color: tone.color }}
            >
              {recognitionMoment}
            </p>
          </div>
        ) : null}

        {/* Legacy (pre-v6) rows close with their reflective question until
            their one-time regeneration replaces it. */}
        {legacyClosingQuestion ? (
          <p
            className="font-voice mt-9 max-w-[58ch] border-t border-zinc-100 pt-8 text-[17px] italic leading-[1.6]"
            style={{ color: tone.color }}
          >
            {legacyClosingQuestion}
          </p>
        ) : null}
      </div>
    </article>
  );
}
