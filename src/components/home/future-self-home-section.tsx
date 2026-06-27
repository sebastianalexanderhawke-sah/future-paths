import Link from "next/link";

import { OverviewSection } from "@/components/overview/overview-section";
import { getFutureSelfTrend } from "@/lib/future-self-trend";
import type { FutureSelf } from "@/types/database";

type FutureSelfHomeSectionProps = {
  futureSelves: FutureSelf[];
};

const FS_COLORS = [
  { bg: "#0A1208", border: "#101E0E", text: "#34D399", label: "PATH 1" },
  { bg: "#0E0A00", border: "#1C1400", text: "#F59E0B", label: "PATH 2" },
  { bg: "#080C16", border: "#0E1428", text: "#38BDF8", label: "PATH 3" },
];

export function FutureSelfHomeSection({ futureSelves }: FutureSelfHomeSectionProps) {
  if (futureSelves.length === 0) return null;

  return (
    <OverviewSection
      label="Becoming"
      title="Who you might become"
      viewAllHref="/future-selves"
      viewAllLabel="View all →"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
        }}
      >
        {futureSelves.slice(0, 3).map((fs, i) => {
          const c = FS_COLORS[i % FS_COLORS.length]!;
          const { delta, direction } = getFutureSelfTrend(fs);
          const trendStr =
            direction === "up"
              ? `↑ +${delta}`
              : direction === "down"
                ? `↓ ${delta}`
                : null;

          return (
            <Link
              key={fs.id}
              href="/future-selves"
              style={{
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: "16px",
                padding: "18px",
                cursor: "pointer",
                minHeight: "148px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                textDecoration: "none",
                transition: "border-color 0.2s",
              }}
              className="hover:border-[#222]"
            >
              {/* Tag */}
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  opacity: 0.3,
                  color: c.text,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {c.label}
              </span>

              {/* Name */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  lineHeight: 1.45,
                  flex: 1,
                  color: c.text,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {fs.name}
              </span>

              {/* Bottom */}
              <div>
                {/* Pct + trend */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "30px",
                      fontWeight: 800,
                      letterSpacing: "-1px",
                      color: c.text,
                      lineHeight: 1,
                    }}
                  >
                    {fs.percentage}%
                  </span>
                  {trendStr ? (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#1E1E2E",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {trendStr}
                    </span>
                  ) : null}
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: "2px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderRadius: "2px",
                    overflow: "hidden",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: `${fs.percentage}%`,
                      height: "100%",
                      backgroundColor: c.text,
                      borderRadius: "2px",
                    }}
                  />
                </div>

                {/* Evidence */}
                <span
                  style={{
                    fontSize: "9px",
                    opacity: 0.2,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#fff",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {fs.evidence_strength} evidence
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </OverviewSection>
  );
}
