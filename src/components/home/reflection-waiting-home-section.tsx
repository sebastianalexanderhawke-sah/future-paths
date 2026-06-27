import Link from "next/link";

import type { ReflectionCheckIn } from "@/lib/reflections";

type ReflectionWaitingHomeSectionProps = {
  pending: ReflectionCheckIn | null;
};

export function ReflectionWaitingHomeSection({ pending }: ReflectionWaitingHomeSectionProps) {
  if (!pending) return null;

  return (
    <div
      style={{
        backgroundColor: "#0C0A18",
        border: "1px solid #161228",
        borderRadius: "16px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        marginBottom: "10px",
        transition: "border-color 0.2s",
      }}
      className="hover:border-[#222]"
    >
      {/* Top-left glow */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          left: "-40px",
          width: "160px",
          height: "160px",
          background: "radial-gradient(circle, #8B7CF808, transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Eyebrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
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
            color: "#2E2050",
            textTransform: "uppercase",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Reflection Waiting
        </span>
      </div>

      {/* From label */}
      <p
        style={{
          fontSize: "11px",
          color: "#201840",
          fontWeight: 500,
          marginBottom: "10px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        From: {pending.moment.title}
      </p>

      {/* Question */}
      <p
        style={{
          fontSize: "18px",
          color: "#C8C0F0",
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: "-0.3px",
          marginBottom: "18px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {pending.reflection_question}
      </p>

      {/* Visual textarea (links to /reflections for actual answering) */}
      <Link href="/reflections" style={{ display: "block", textDecoration: "none" }}>
        <div
          style={{
            width: "100%",
            backgroundColor: "#080814",
            border: "1px solid #14121E",
            borderRadius: "12px",
            padding: "14px 16px",
            color: "#2A2050",
            fontSize: "13px",
            height: "72px",
            cursor: "text",
            fontFamily: "system-ui, -apple-system, sans-serif",
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: "#161428", fontSize: "13px" }}>
            What&apos;s on your mind...
          </span>
        </div>
      </Link>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "14px",
        }}
      >
        <Link
          href="/reflections"
          style={{
            fontSize: "11px",
            color: "#1E1830",
            textDecoration: "none",
            cursor: "pointer",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Skip
        </Link>
        <Link
          href="/reflections"
          style={{
            background: "linear-gradient(135deg, #7C6AFA, #9B8BFF)",
            color: "#fff",
            border: "none",
            borderRadius: "20px",
            padding: "9px 20px",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block",
            fontFamily: "system-ui, -apple-system, sans-serif",
            cursor: "pointer",
          }}
        >
          Answer
        </Link>
      </div>
    </div>
  );
}
