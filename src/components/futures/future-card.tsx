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
  /**
   * Presentation only: drops the card's own border and radius when a host
   * surface (the deep-dive dialog) already provides the frame — otherwise
   * the card's rounded corners scroll visibly inside the dialog.
   */
  frameless?: boolean;
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

/** One short bullet — the card's shared list voice for gains and tradeoffs. */
function BulletList({
  items,
  dotColor,
}: {
  items: string[];
  dotColor: string;
}) {
  return (
    <ul className="mt-3 max-w-[58ch] space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-[15px] leading-relaxed text-zinc-700"
        >
          <span
            aria-hidden="true"
            className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: dotColor, opacity: 0.7 }}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * One dominant trait, worn as a person (Phase 4). The card answers, in a
 * fixed order: who this trait makes you (the library's 2–3-word archetype
 * name + its hand-written one-sentence quote), how likely this future is,
 * has it moved since the last update, what this trait usually becomes (plain
 * prose), what it strengthens (three gains), its tradeoffs (three honest
 * costs) — closed by "Why Reflection Believes This", the evidence checklist
 * collapsed by default so understanding precedes the receipts.
 *
 * Headline and quote come from the identity library via the row's
 * identity_id; rows whose identity the library has retired (and fixture
 * rows) fall back to the stored name with no quote — nothing disappears.
 * The narrative fields are AI-authored in the v8 encoding:
 * why_emerging carries one evidence bullet per line; growth_opportunities
 * the three "strengthens" bullets; blind_spots the three tradeoff bullets;
 * likely_evolution the single "usually becomes" paragraph. Pre-v8 rows keep
 * rendering (their first likely_evolution line, and however many list items
 * they hold) until their one-time format_upgrade regeneration. Faded futures
 * lead with FadedFutureCard, which preserves this card behind its "View
 * original Future Self" reveal.
 */
export function FutureCard({ futureSelf, accent, frameless = false }: FutureCardProps) {
  const tone = accent ?? NEUTRAL_ACCENT;
  const pct = Math.max(0, Math.min(100, futureSelf.percentage));
  const movement = getMovementStory(futureSelf);
  const profile = futureSelf.identity_id
    ? getIdentityById(futureSelf.identity_id)
    : undefined;

  const headline = profile?.canonical_name ?? futureSelf.name;
  const quote = profile?.identity_statement;

  // Phase 5.1: a curated identity's becomes / strengthens / tradeoffs are
  // permanent library editorial — rendered from the library itself, so a
  // copy edit reaches every card instantly and stored rows can never drift.
  // Non-curated identities keep the v8 AI encoding (see explain-identity):
  // growth_opportunities and blind_spots carry exactly three bullets each
  // (pre-v8 rows hold one — rendered as-is until regeneration);
  // likely_evolution is a single plain paragraph (pre-v8 rows hold
  // multi-line encodings, so only the first line — always the portrait —
  // renders until regeneration). why_emerging is always AI-personalized:
  // one evidence bullet per line.
  const curated = profile?.curated_narrative;
  const evidenceBullets = futureSelf.why_emerging
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
  const strengthens = curated
    ? [...curated.strengthens]
    : futureSelf.growth_opportunities
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
  const tradeoffs = curated
    ? [...curated.tradeoffs]
    : futureSelf.blind_spots
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
  const becomesParagraphs = curated
    ? [...curated.becomes]
    : futureSelf.likely_evolution
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 1);

  // The one AI-personalized sentence on a curated card: why this future is
  // emerging right now. It lives in the row's summary once generated; until
  // then the summary still holds the library description, which must not
  // read as personal — the sentence simply doesn't render in that window.
  const personalizedSummary =
    curated &&
    futureSelf.summary &&
    futureSelf.summary !== profile?.short_description
      ? futureSelf.summary
      : null;

  // "Why Reflection Believes This" closes the card collapsed by default:
  // the reader meets the trait, sees what it builds and costs, and only
  // then opens the receipts if curious. It is the card's ONE evidence home
  // (Phase 9.2): the personalized why_emerging checklist plus the raw
  // receipts — the recorded behavior that moved this future when the
  // pipeline attributed any, otherwise the situations, check-ins, and
  // reflections that support it.
  const [showWhy, setShowWhy] = useState(false);
  const receipts =
    movement && movement.evidence.length > 0
      ? movement.evidence
      : getEvidence(futureSelf);
  const hasEvidenceSection = evidenceBullets.length > 0 || receipts.length > 0;

  return (
    <article
      className={
        frameless
          ? "overflow-hidden bg-white"
          : "overflow-hidden rounded-2xl border border-zinc-100 bg-white"
      }
    >
      {/* Accent band: the profile carries the color of the branch it grew
          from. */}
      <div aria-hidden="true" className="h-1" style={{ background: tone.color }} />

      <div className="p-8 sm:px-10 sm:py-9">
        {/* 1 — The archetype this trait grows into: its human name in the
            product's serif voice, then the library's one-sentence quote. */}
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
              {headline}
            </h3>
            {quote ? (
              <p className="font-voice mt-1.5 text-[15px] italic leading-snug text-zinc-500">
                “{quote}”
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-zinc-500">
                {futureSelf.evidence_strength}
              </p>
            )}
          </div>
        </header>

        {/* 1b — Why this future is emerging right now: the single
            AI-personalized sentence (Phase 5.2 placement — below the quote,
            above Likelihood). Absent until the row has been personalized. */}
        {personalizedSummary ? (
          <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-zinc-600">
            {personalizedSummary}
          </p>
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
            {quote ? (
              <span className="ml-1.5 text-zinc-400">· {futureSelf.evidence_strength}</span>
            ) : null}
          </p>
        </div>

        {/* 2 — Has this future changed? The movement and one grounded
            sentence. The receipts behind it live in the card's single
            evidence section below ("Why Reflection Believes This"). */}
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
          </div>
        ) : null}

        {/* 3 — What This Usually Becomes: what people with this growing
            trait naturally become — plain prose, standard body color. A
            hairline marks where the status zone ends and the reading
            begins. Curated identities carry three short paragraphs of
            permanent library copy; AI-narrated ones a single paragraph. */}
        {becomesParagraphs.length > 0 ? (
          <div className="mt-9 border-t border-zinc-100 pt-8">
            <SectionLabel>What This Usually Becomes</SectionLabel>
            <div className="mt-3 max-w-[58ch] space-y-3">
              {becomesParagraphs.map((paragraph) => (
                <p key={paragraph} className="text-[15px] leading-[1.7] text-zinc-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {/* 4 — What This Strengthens: three real gains. */}
        {strengthens.length > 0 ? (
          <div className="mt-9">
            <SectionLabel>What This Strengthens</SectionLabel>
            <BulletList items={strengthens} dotColor={tone.color} />
          </div>
        ) : null}

        {/* 5 — Tradeoffs: three honest costs, in the same list voice —
            balance, not warning. */}
        {tradeoffs.length > 0 ? (
          <div className="mt-9">
            <SectionLabel>Tradeoffs</SectionLabel>
            <BulletList items={tradeoffs} dotColor="#a1a1aa" />
          </div>
        ) : null}

        {/* 6 — Why Reflection Believes This: the card's one evidence home,
            last and collapsed by default — understand the trait, recognize
            it, then explore the evidence if curious. Same quiet
            aria-expanded disclosure idiom as every other in-card reveal.
            Inside: the ✓ checklist (one bullet per line of why_emerging),
            then the raw receipts from the user's recorded moments. */}
        {hasEvidenceSection ? (
          <div className="mt-9 border-t border-zinc-100 pt-8">
            <button
              type="button"
              aria-expanded={showWhy}
              onClick={() => setShowWhy((current) => !current)}
              className="-mx-2 -my-1.5 flex w-[calc(100%+16px)] cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Why Reflection Believes This
                </span>
                <span className="mt-1 block text-[13px] text-zinc-500">
                  The moments that led Reflection here.
                </span>
              </span>
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  showWhy ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M4 6l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {showWhy ? (
              <div className="reveal-in">
                {evidenceBullets.length > 0 ? (
                  <ul className="mt-4 max-w-[60ch] space-y-2">
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
                ) : null}
                {receipts.length > 0 ? (
                  <div className={evidenceBullets.length > 0 ? "mt-5" : "mt-4"}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                      From your recorded moments
                    </p>
                    <ul className="mt-2.5 max-w-[60ch] space-y-1.5">
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
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
