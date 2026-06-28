import Link from "next/link";

import { OverviewSection } from "@/components/overview/overview-section";
import type { CurrentSelf } from "@/types/database";

type Props = { currentSelf: CurrentSelf | null };

// Per-chip light-palette colors cycling across themes
const CHIP_COLORS = [
  { bg: "#ecebfc", text: "#6b54e0", border: "#c4bef8" },
  { bg: "#fdf2dc", text: "#b87416", border: "#f0d090" },
  { bg: "#e6f4ed", text: "#1a8044", border: "#9cd4b0" },
  { bg: "#e4edfb", text: "#1a58c0", border: "#9cc4f0" },
  { bg: "#fce8ec", text: "#b8244e", border: "#f0b8c4" },
];

export function CurrentSelfHomeSection({ currentSelf }: Props) {
  if (!currentSelf) return null;

  const themes = currentSelf.themes.slice(0, 5);

  return (
    <OverviewSection id="self">
      <div
        style={{
          background: "#f0efeb",
          borderRadius: "22px",
          overflow: "hidden",
          position: "relative",
          color: "#0a0a0a",
          minHeight: "180px",
        }}
      >
        {/* Arrow button */}
        <Link
          href="/current-self"
          className="transition-transform duration-150 hover:scale-105"
          style={{
            position: "absolute",
            top: "28px",
            right: "28px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontSize: "15px",
            color: "#111",
            zIndex: 2,
          }}
        >
          →
        </Link>

        {/* 3D Orb element */}
        <div
          style={{
            position: "absolute",
            right: "60px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            zIndex: 1,
          }}
        >
          {/* Orb */}
          <div
            style={{
              width: "82px",
              height: "82px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 36% 32%, #d8d2ff, #8b7cf8 44%, #5c4ec0 80%)",
              boxShadow:
                "0 14px 40px rgba(139,124,248,0.28), inset 0 -4px 14px rgba(0,0,0,0.18), inset 4px 4px 10px rgba(255,255,255,0.38)",
            }}
          />
          {/* Platform bars */}
          {[
            { w: "110px", h: "14px" },
            { w: "135px", h: "12px" },
            { w: "160px", h: "10px" },
          ].map((bar, i) => (
            <div
              key={i}
              style={{
                width: bar.w,
                height: bar.h,
                background: "#e8e6de",
                borderRadius: "6px",
                borderTop: "1px solid #f0eee6",
              }}
            />
          ))}
          {/* Shadow ellipse */}
          <div
            style={{
              width: "100px",
              height: "14px",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse, rgba(139,124,248,0.12), transparent)",
              marginTop: "2px",
            }}
          />
        </div>

        {/* Content */}
        <div
          style={{
            padding: "38px 44px",
            paddingRight: "340px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Tag chip */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#eeedfb",
              borderRadius: "10px",
              padding: "5px 12px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#8b7cf8",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#8b7cf8",
              }}
            >
              Current Self
            </span>
          </div>

          {/* Identity statement */}
          <p
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "#111",
              lineHeight: 1.25,
              letterSpacing: "-0.6px",
              marginBottom: "10px",
            }}
          >
            {currentSelf.title}
          </p>

          {/* Description */}
          {currentSelf.summary ? (
            <p
              style={{
                fontSize: "14px",
                color: "#999",
                lineHeight: 1.5,
                marginBottom: "20px",
              }}
            >
              {currentSelf.summary}
            </p>
          ) : null}

          {/* Trait chips */}
          {themes.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: currentSelf.summary ? "0" : "20px",
              }}
            >
              {themes.map((theme, i) => {
                const c = CHIP_COLORS[i % CHIP_COLORS.length]!;
                return (
                  <span
                    key={theme}
                    style={{
                      background: c.bg,
                      color: c.text,
                      border: `1.5px solid ${c.border}`,
                      borderRadius: "20px",
                      padding: "5px 14px",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {theme}
                  </span>
                );
              })}
            </div>
          ) : null}

          {/* View full profile link */}
          <Link
            href="/current-self"
            style={{
              display: "inline-block",
              marginTop: "16px",
              fontSize: "12px",
              color: "#bbb",
              textDecoration: "none",
            }}
          >
            View full profile →
          </Link>
        </div>
      </div>
    </OverviewSection>
  );
}
