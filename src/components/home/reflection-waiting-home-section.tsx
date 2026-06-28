import Link from "next/link";

import type { ReflectionCheckIn } from "@/lib/reflections";

type Props = { pending: ReflectionCheckIn | null };

export function ReflectionWaitingHomeSection({ pending }: Props) {
  if (!pending) return null;

  return (
    <div
      style={{
        background: "#f4f0ff",
        borderRadius: "16px",
        padding: "28px",
        position: "relative",
        overflow: "hidden",
        color: "#0a0a0a",
      }}
    >
      {/* Tag */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#ede8ff",
          borderRadius: "10px",
          padding: "5px 12px",
          marginBottom: "16px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#8b7cf8" }}>✦</span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: "#6d5ce6",
          }}
        >
          Reflection Waiting
        </span>
      </div>

      {/* From label */}
      <p
        style={{
          fontSize: "10px",
          color: "#9090c0",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 600,
          marginBottom: "4px",
        }}
      >
        From your situation
      </p>
      <p
        style={{
          fontSize: "11px",
          color: "#8080b8",
          marginBottom: "12px",
        }}
      >
        {pending.moment.title}
      </p>

      {/* Question */}
      <p
        style={{
          fontSize: "19px",
          fontWeight: 700,
          color: "#1e0e60",
          lineHeight: 1.4,
          letterSpacing: "-0.3px",
          marginBottom: "16px",
        }}
      >
        {pending.reflection_question}
      </p>

      {/* Textarea visual */}
      <Link href="/reflections" style={{ display: "block", textDecoration: "none" }}>
        <div
          style={{
            background: "#fff",
            border: "1.5px solid #d0c8f8",
            borderRadius: "11px",
            padding: "14px 16px",
            height: "68px",
            display: "flex",
            alignItems: "flex-start",
            cursor: "text",
          }}
        >
          <span style={{ fontSize: "13px", color: "#c0b8e8" }}>
            Take your time...
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
          style={{ fontSize: "11px", color: "#a8a0d0", textDecoration: "none" }}
        >
          Skip for now
        </Link>
        <Link
          href="/reflections"
          style={{
            background: "#8b7cf8",
            color: "#fff",
            borderRadius: "20px",
            padding: "8px 18px",
            fontSize: "12px",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Save reflection
        </Link>
      </div>
    </div>
  );
}
