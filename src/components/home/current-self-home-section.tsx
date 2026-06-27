import Link from "next/link";

import { OverviewSection } from "@/components/overview/overview-section";
import type { CurrentSelf } from "@/types/database";

type CurrentSelfHomeSectionProps = {
  currentSelf: CurrentSelf | null;
};

const CHIP_COLORS = [
  { bg: "#150E00", text: "#F59E0B", border: "#251800" },
  { bg: "#071210", text: "#34D399", border: "#0A2018" },
  { bg: "#060E18", text: "#38BDF8", border: "#091628" },
  { bg: "#100A20", text: "#A78BFA", border: "#1E1238" },
  { bg: "#180810", text: "#FB7185", border: "#280C18" },
];

export function CurrentSelfHomeSection({ currentSelf }: CurrentSelfHomeSectionProps) {
  if (!currentSelf) return null;

  const themes = currentSelf.themes.slice(0, 5);

  return (
    <OverviewSection
      label="Identity"
      title="Who you are right now"
      viewAllHref="/current-self"
      viewAllLabel="Full profile →"
    >
      {/* Card */}
      <div
        style={{
          backgroundColor: "#0C0C0C",
          border: "1px solid #141414",
          borderRadius: "16px",
          padding: "24px",
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.2s",
        }}
        className="hover:border-[#222]"
      >
        {/* Top-right glow */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "180px",
            height: "180px",
            background: "radial-gradient(circle, #A78BFA08, transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Pill tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#1A1030",
            border: "1px solid #2A1848",
            borderRadius: "20px",
            padding: "3px 10px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#A78BFA",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#4A4A8A",
              textTransform: "uppercase",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Current Self
          </span>
        </div>

        {/* Identity statement */}
        <p
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#E0E0F0",
            lineHeight: 1.3,
            letterSpacing: "-0.5px",
            marginBottom: "16px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {currentSelf.title}
        </p>

        {/* Trait chips */}
        {themes.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {themes.map((theme, i) => {
              const c = CHIP_COLORS[i % CHIP_COLORS.length]!;
              return (
                <span
                  key={theme}
                  style={{
                    backgroundColor: c.bg,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: "20px",
                    padding: "5px 13px",
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {theme}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </OverviewSection>
  );
}
