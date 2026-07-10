import { ChapterDisclosure } from "@/components/timeline/chapter-disclosure";
import { OverviewCard } from "@/components/overview/overview-card";
import type { MonthlyIdentityNarrative } from "@/lib/monthly-identity-narrative";

type MonthlyIdentityNarrativeCardProps = {
  narrative: MonthlyIdentityNarrative;
};

// Same tones as the Overview "What's Changed" rows. Direction comes from
// the statement's own fixed wording ("You became more/less …") — the text
// itself is never altered.
const CHANGE_STYLES = {
  up: { bg: "#ecfdf5", color: "#10b981", glyph: "↑" },
  down: { bg: "#fff1f2", color: "#f43f5e", glyph: "↓" },
};

function changeKind(statement: string): keyof typeof CHANGE_STYLES {
  return statement.startsWith("You became less") ? "down" : "up";
}

export function MonthlyIdentityNarrativeCard({
  narrative,
}: MonthlyIdentityNarrativeCardProps) {
  const { situationCount, checkInCount, reflectionCount } = narrative;

  // Preview = first paragraph; the rest reads on demand.
  const preview = narrative.openingBeginning || narrative.openingEnd || null;
  const remaining =
    narrative.openingBeginning && narrative.openingEnd
      ? [narrative.openingEnd]
      : [];

  const evidenceStats = [
    {
      value: situationCount,
      label: situationCount === 1 ? "situation" : "situations",
    },
    {
      value: checkInCount,
      label: checkInCount === 1 ? "check-in" : "check-ins",
    },
    {
      value: reflectionCount,
      label: reflectionCount === 1 ? "reflection" : "reflections",
    },
  ];

  return (
    <OverviewCard className="px-9 pb-8 pt-8">
      {/* The chapter title is the hero; the month lives on the rail. */}
      <h3 className="font-voice max-w-[24em] text-[24px] font-medium leading-[1.3] tracking-[-0.3px] text-[#111]">
        {narrative.headline}
      </h3>

      {preview ? (
        <p className="mt-3 max-w-[52em] text-[14px] leading-[1.7] text-[#777777]">
          {preview}
        </p>
      ) : null}

      <ChapterDisclosure paragraphs={remaining} />

      {narrative.howYouChanged.length > 0 ? (
        <div className="mt-7">
          <p className="mb-1 text-[12px] font-semibold text-[#999999]">
            How You Changed
          </p>
          <div>
            {narrative.howYouChanged.map((change, i) => {
              const style = CHANGE_STYLES[changeKind(change)];
              return (
                <div
                  key={change}
                  className={[
                    "flex items-center gap-3.5 py-3",
                    i < narrative.howYouChanged.length - 1
                      ? "border-b border-[#f5f5f5]"
                      : "",
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px]"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {style.glyph}
                  </span>
                  <span className="text-[14px] font-medium leading-snug text-[#111]">
                    {change}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-7">
        <p className="mb-3 text-[12px] font-semibold text-[#999999]">
          Evidence
        </p>
        <div className="grid max-w-[420px] grid-cols-3 gap-5">
          {evidenceStats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[28px] font-extrabold leading-none tracking-[-1px] text-[#111]">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[12px] font-medium text-[#999999]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </OverviewCard>
  );
}
