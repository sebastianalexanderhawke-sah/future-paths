import Link from "next/link";

import { OverviewSection } from "@/components/overview/overview-section";
import type { FutureSelf } from "@/types/database";

type Props = { futureSelves: FutureSelf[] };

const RING_COLORS = ["#8b7cf8", "#f59e0b", "#60a5fa"];

function percentage(fs: FutureSelf) {
  return Math.min(100, Math.max(0, fs.percentage));
}

function dashOffset(pct: number) {
  const circumference = 226;
  return circumference - (pct / 100) * circumference;
}

export function FutureSelfHomeSection({ futureSelves }: Props) {
  if (futureSelves.length === 0) return null;

  const displayed = futureSelves.slice(0, 3);

  return (
    <OverviewSection id="future-selves">
      <div
        style={{
          background: "#f0efeb",
          borderRadius: "22px",
          overflow: "hidden",
          position: "relative",
          color: "#0a0a0a",
          padding: "38px 44px",
        }}
      >
        {/* Arrow button */}
        <Link
          href="/future-selves"
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
          }}
        >
          →
        </Link>

        {/* Tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#eeedfb",
            borderRadius: "10px",
            padding: "5px 12px",
            marginBottom: "24px",
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
            Future Selves
          </span>
        </div>

        {/* Grid: text left, rings right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: "40px",
          }}
        >
          {/* Left: title + desc */}
          <div>
            <p
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#111",
                lineHeight: 1.25,
                letterSpacing: "-0.4px",
                marginBottom: "8px",
              }}
            >
              Multiple versions of your future.
            </p>
            <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.5 }}>
              Possible trajectories based on your choices.
            </p>
          </div>

          {/* Right: progress rings */}
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
            {displayed.map((fs, i) => {
              const pct = percentage(fs);
              const offset = dashOffset(pct);
              const color = RING_COLORS[i % RING_COLORS.length]!;

              return (
                <div
                  key={fs.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {/* SVG ring */}
                  <div style={{ position: "relative", width: "86px", height: "86px" }}>
                    <svg
                      width="86"
                      height="86"
                      viewBox="0 0 86 86"
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      {/* Track */}
                      <circle
                        cx="43"
                        cy="43"
                        r="36"
                        fill="none"
                        stroke="#e8e6de"
                        strokeWidth="7"
                      />
                      {/* Fill */}
                      <circle
                        cx="43"
                        cy="43"
                        r="36"
                        fill="none"
                        stroke={color}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray="226"
                        strokeDashoffset={offset}
                      />
                    </svg>
                    {/* Centered text */}
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#111",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Name */}
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#777",
                      textAlign: "center",
                      maxWidth: "80px",
                      lineHeight: 1.3,
                    }}
                  >
                    {fs.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </OverviewSection>
  );
}
