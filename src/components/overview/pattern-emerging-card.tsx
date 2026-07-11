import Link from "next/link";

import { toFirstSentence } from "@/components/home/output-refinement";
import { IconSparkle } from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";
import type { FocusArea } from "@/lib/focus-areas";
import { getFutureSelfTrend } from "@/lib/future-self-trend";
import { getPatternMomentum } from "@/lib/pattern-momentum";
import type { FutureSelf } from "@/types/database";

/**
 * The Overview's one interpretive card, told as a single story in three
 * beats: this pattern… (name + one sentence) → is currently… (momentum)
 * → and here is where your attention has been living (focus). Everything it
 * says is derived from existing data — the trend from the row's own
 * percentages, the focus areas from themes the user's entries already carry
 * — so the card narrates without recognizing, scoring, or storing anything.
 *
 * Layout is deliberately section-per-beat: richer momentum states, more
 * focus rows, clickable areas (FocusArea already carries an optional href),
 * or monthly comparisons (it keeps its raw mention count) all slot into an
 * existing section without a redesign.
 */
type PatternEmergingCardProps = {
  futureSelf: FutureSelf;
  /** Where recent attention went, strongest first (≤4, never padded). */
  focusAreas: FocusArea[];
};

/** Small uppercase beat label — the card's only structural signage. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
      {children}
    </p>
  );
}

/**
 * One area of life and how much recent thinking went toward it. The bar is
 * relative attention only — not success, importance, or progress — so it
 * stays a soft monochrome violet: width is the whole message. A small floor
 * keeps the faintest area visible without inflating it. Becomes a link the
 * day areas start carrying hrefs.
 */
function FocusRow({ area }: { area: FocusArea }) {
  const width = `${Math.round(12 + area.weight * 88)}%`;
  const body = (
    <div
      role="img"
      aria-label={`${area.theme}: ${area.mentions} recent ${
        area.mentions === 1 ? "moment" : "moments"
      } of attention`}
    >
      <p className="text-[14px] font-medium text-[#111]">{area.theme}</p>
      <div className="mt-1.5 h-2 rounded-full bg-[rgba(139,92,246,0.10)]">
        <div
          className="h-full rounded-full bg-[rgba(139,92,246,0.6)]"
          style={{ width }}
        />
      </div>
    </div>
  );

  if (area.href) {
    return (
      <Link
        href={area.href}
        className="block transition-opacity duration-150 hover:opacity-80"
      >
        {body}
      </Link>
    );
  }
  return body;
}

export function PatternEmergingCard({
  futureSelf,
  focusAreas,
}: PatternEmergingCardProps) {
  const sentence =
    toFirstSentence(futureSelf.summary, 160) ||
    toFirstSentence(futureSelf.why_emerging, 160);
  const momentum = getPatternMomentum(getFutureSelfTrend(futureSelf));

  return (
    <OverviewCard className="px-9 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[#8b5cf6]">
            <IconSparkle size={16} />
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">
            Pattern Emerging
          </h2>
        </div>
        <p className="mt-1 text-[12px] text-[#aab0bb]">
          Why your futures are changing
        </p>
      </div>

      {/* The whole story lives on one translucent violet surface — the card's
          identity — with faint violet hairlines separating its three beats. */}
      <div className="divide-y divide-[rgba(139,92,246,0.12)] rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(139,92,246,0.06)] px-7">
        {/* Beat 1 — this pattern… */}
        <div className="py-6">
          <p className="font-voice text-[22px] font-medium leading-[1.35] tracking-[-0.3px] text-[#111]">
            {futureSelf.name}
          </p>
          {sentence ? (
            <p className="mt-2 max-w-[46em] text-[14px] leading-[1.7] text-[#6b6b76]">
              {sentence}
            </p>
          ) : null}
        </div>

        {/* Beat 2 — is currently… The trajectory is the card's loudest line
            after the name: glyph in the identity violet, verdict in ink. */}
        <div className="py-5">
          <SectionLabel>Momentum</SectionLabel>
          <p className="flex items-baseline gap-2.5">
            <span aria-hidden="true" className="text-[15px] text-[#7c3aed]">
              {momentum.glyph}
            </span>
            <span className="text-[18px] font-semibold tracking-[-0.2px] text-[#111]">
              {momentum.label}
            </span>
          </p>
          <p className="mt-1.5 max-w-[46em] text-[14px] leading-[1.6] text-[#6b6b76]">
            {momentum.phrase}
          </p>
        </div>

        {/* Beat 3 — where your attention has been living. Only areas the
            user's own entries actually carried, strongest first, never
            padded to fill the space. */}
        <div className="py-5 pb-6">
          <SectionLabel>Your Focus</SectionLabel>
          {focusAreas.length === 0 ? (
            <p className="text-[14px] leading-[1.6] text-[#6b6b76]">
              Not enough recent entries to see where your attention is going
              yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {focusAreas.map((area) => (
                <FocusRow key={area.theme} area={area} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href="/future-selves"
          className="text-[13px] font-medium text-[#7c3aed] transition-opacity duration-150 hover:opacity-80"
        >
          View all patterns →
        </Link>
      </div>
    </OverviewCard>
  );
}
