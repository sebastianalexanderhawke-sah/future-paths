import Link from "next/link";

import { toFirstSentence } from "@/components/home/output-refinement";
import { IconSparkle } from "@/components/icons";
import { OverviewCard } from "@/components/overview/overview-card";
import type { FutureSelf } from "@/types/database";

export type PatternImpactRow = {
  key: string;
  name: string;
  delta: number;
};

type PatternEmergingCardProps = {
  futureSelf: FutureSelf;
  impacts: PatternImpactRow[];
};

const FREQUENCY_DOTS = 10;

export function PatternEmergingCard({
  futureSelf,
  impacts,
}: PatternEmergingCardProps) {
  const headline =
    toFirstSentence(futureSelf.why_emerging, 110) ||
    toFirstSentence(futureSelf.summary, 110);
  const description =
    toFirstSentence(futureSelf.summary, 160) ||
    toFirstSentence(futureSelf.likely_evolution, 160);

  const supportingCount = Math.min(
    FREQUENCY_DOTS,
    futureSelf.supporting_situations?.length ?? 0,
  );

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
          An insight about your recent behavior
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

        {/* Right — frequency, then impact. */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
              Pattern frequency
            </span>
            <span className="text-[11px] font-medium text-[#b8bac6]">
              Last {FREQUENCY_DOTS} situations
            </span>
          </div>
          <div
            className="flex gap-2"
            role="img"
            aria-label={`${supportingCount} of ${FREQUENCY_DOTS} recent situations support this pattern`}
          >
            {Array.from({ length: FREQUENCY_DOTS }, (_, i) => (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full"
                style={{
                  background: i < supportingCount ? "#7c3aed" : "#e8e8ef",
                }}
              />
            ))}
          </div>

          <div className="mt-6">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
              Impact on your Future Paths
            </p>
            {impacts.length === 0 ? (
              <p className="py-1 text-[13px] text-[#9ca3af]">
                No movement since your last update.
              </p>
            ) : (
              impacts.map((impact, i) => (
                <div
                  key={impact.key}
                  className={[
                    "flex items-center justify-between py-2",
                    i < impacts.length - 1 ? "border-b border-[#f5f5f7]" : "",
                  ].join(" ")}
                >
                  <span className="truncate text-[13px] text-[#6b7280]">
                    {impact.name}
                  </span>
                  <span
                    className="ml-3 whitespace-nowrap text-[13px] font-semibold tabular-nums"
                    style={{ color: impact.delta >= 0 ? "#10b981" : "#f43f5e" }}
                  >
                    {impact.delta > 0 ? "+" : ""}
                    {impact.delta}%
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
