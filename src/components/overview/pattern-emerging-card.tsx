import Link from "next/link";

import { toFirstSentence } from "@/components/home/output-refinement";
import { IconSparkle } from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";
import type { EvidenceSourceCounts } from "@/lib/evidence-sources";
import type { FutureSelf } from "@/types/database";

/**
 * One row of the influence list. This card is the Overview's causal layer —
 * it answers "why are your futures changing?" as one argument: the insight
 * (left), then the evidence behind it and the futures it is influencing
 * (right). What's Changed stays a bare summary; the explanation lives here.
 */
export type PatternImpactRow = {
  key: string;
  name: string;
  /** Signed movement since the last update. */
  delta: number;
};

type PatternEmergingCardProps = {
  futureSelf: FutureSelf;
  impacts: PatternImpactRow[];
  /** How many of the pattern's strongest persisted observations came from
      each source — the five-dot evidence meter's data (see
      lib/evidence-sources.ts; counts are already bounded by the ≤5-row
      attribution list, so a count IS a dot count). */
  evidenceSources: EvidenceSourceCounts;
};

const EVIDENCE_DOTS = 5;

/**
 * The evidence meter: a quiet, reusable mark — five circles, filled
 * left-to-right by how much of the pattern's strongest evidence a source
 * contributed. Static by design (no animation, no decoration), but tactile:
 * a filled dot carries a soft top-lit gradient and rests on a faint tinted
 * shadow, an empty dot reads as a shallow recess — evidence you can feel is
 * present or missing at a glance, without ever competing with the insight
 * panel.
 */
function EvidenceMeter({ label, filled }: { label: string; filled: number }) {
  const count = Math.max(0, Math.min(EVIDENCE_DOTS, Math.round(filled)));
  return (
    <div
      className="flex items-center justify-between gap-3 py-[5px]"
      role="img"
      aria-label={`${label}: ${count} of ${EVIDENCE_DOTS} strongest observations`}
    >
      <span className="text-[13px] text-[#6b7280]">{label}</span>
      <span className="flex shrink-0 gap-2">
        {Array.from({ length: EVIDENCE_DOTS }, (_, i) => (
          <span
            key={i}
            className="h-[11px] w-[11px] rounded-full"
            style={
              i < count
                ? {
                    background: "linear-gradient(180deg, #8f65f0 0%, #7c3aed 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 3px rgba(124,58,237,0.35)",
                  }
                : {
                    background: "#f0f0f4",
                    boxShadow:
                      "inset 0 1px 2px rgba(17,17,17,0.07), inset 0 0 0 1px #e7e7ee",
                  }
            }
          />
        ))}
      </span>
    </div>
  );
}

export function PatternEmergingCard({
  futureSelf,
  impacts,
  evidenceSources,
}: PatternEmergingCardProps) {
  const headline =
    toFirstSentence(futureSelf.why_emerging, 110) ||
    toFirstSentence(futureSelf.summary, 110);
  const description =
    toFirstSentence(futureSelf.summary, 160) ||
    toFirstSentence(futureSelf.likely_evolution, 160);

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

      <div className="grid grid-cols-2 items-start gap-10">
        {/* Left — the insight leads, set on its own translucent violet
            panel: a highlighted quotation, the app interpreting a life.
            Only this narrative block wears the tint; the supporting data
            on the right stays on the card's neutral surface. */}
        <div className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(139,92,246,0.06)] px-6 py-5">
          <p className="font-voice text-[20px] font-medium leading-[1.4] tracking-[-0.3px] text-[#111]">
            {headline}
          </p>
          {description ? (
            <p className="mt-3 text-[14px] leading-[1.7] text-[#6b6b76]">
              {description}
            </p>
          ) : null}
          <Link
            href="/future-selves"
            className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[#7c3aed] transition-opacity duration-150 hover:opacity-80"
          >
            Read more about this pattern →
          </Link>
        </div>

        {/* Right — one argument in two beats: how much evidence backs the
            insight (by source), then which futures it is influencing. The
            insight on the left stays the protagonist; this column is its
            supporting case. */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
            Evidence
          </p>
          <EvidenceMeter label="Situations" filled={evidenceSources.situations} />
          <EvidenceMeter label="Check-ins" filled={evidenceSources.checkIns} />
          <EvidenceMeter label="Reflections" filled={evidenceSources.reflections} />

          <div className="mt-6">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
              Influencing
            </p>
            {impacts.length === 0 ? (
              <p className="py-1 text-[13px] text-[#9ca3af]">
                No movement since your last update.
              </p>
            ) : (
              impacts.map((impact) => (
                <div
                  key={impact.key}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span
                    className="w-11 shrink-0 text-[13px] font-semibold tabular-nums"
                    style={{ color: impact.delta >= 0 ? "#10b981" : "#f43f5e" }}
                  >
                    {impact.delta > 0 ? "+" : ""}
                    {impact.delta}%
                  </span>
                  <span className="truncate text-[13px] text-[#6b7280]">
                    {impact.name}
                  </span>
                </div>
              ))
            )}
          </div>
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
