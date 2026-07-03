import Link from "next/link";

import { toFirstSentence } from "@/components/home/output-refinement";
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
    <OverviewCard className="px-9 pb-6 pt-6">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[18px] leading-none text-[#6366f1]">
            ✦
          </span>
          <h2 className="text-[17px] font-bold text-[#111]">
            Pattern Emerging
          </h2>
        </div>
        <p className="mt-1 text-[13px] text-[#999999]">
          An insight about your recent behavior
        </p>
      </div>

      <div className="grid grid-cols-2 items-start gap-10">
        {/* Left — the insight leads; the right column supports it. */}
        <div>
          <p className="font-voice text-[20px] font-medium leading-[1.4] tracking-[-0.3px] text-[#111]">
            {headline}
          </p>
          {description ? (
            <p className="mt-2 text-[14px] leading-[1.7] text-[#777777]">
              {description}
            </p>
          ) : null}
          <Link
            href="/future-selves"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#6366f1] transition-opacity duration-150 hover:opacity-80"
          >
            Read more about this pattern →
          </Link>
        </div>

        {/* Right — frequency, then impact. */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#999999]">
              Pattern frequency
            </span>
            <span className="text-[12px] font-medium text-[#bbbbbb]">
              Supporting situations
            </span>
          </div>
          <div
            className="flex gap-1.5"
            role="img"
            aria-label={`${supportingCount} of ${FREQUENCY_DOTS} recent situations support this pattern`}
          >
            {Array.from({ length: FREQUENCY_DOTS }, (_, i) => (
              <span
                key={i}
                className="h-4 w-4 rounded-full"
                style={{
                  background: i < supportingCount ? "#6366f1" : "#ececf0",
                }}
              />
            ))}
          </div>

          <div className="mt-5">
            <p className="mb-1 text-[12px] font-semibold text-[#999999]">
              Impact on your Future Paths
            </p>
            {impacts.length === 0 ? (
              <p className="py-1 text-[13px] text-[#999999]">
                No movement since your last update.
              </p>
            ) : (
              impacts.map((impact, i) => (
                <div
                  key={impact.key}
                  className={[
                    "flex items-center justify-between py-[6px]",
                    i < impacts.length - 1 ? "border-b border-[#f5f5f7]" : "",
                  ].join(" ")}
                >
                  <span className="truncate text-[13px] font-medium text-[#111]">
                    {impact.name}
                  </span>
                  <span
                    className="ml-3 whitespace-nowrap text-[13px] font-bold"
                    style={{ color: impact.delta >= 0 ? "#22c55e" : "#ef4444" }}
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
    </OverviewCard>
  );
}
