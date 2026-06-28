"use client";

export function OverviewScrollHint() {
  return (
    <div
      style={{
        position: "fixed",
        right: "28px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        zIndex: 100,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Mouse outline */}
      <div
        style={{
          width: "26px",
          height: "40px",
          border: "1px solid #1e1e1e",
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "6px",
            transform: "translateX(-50%)",
            width: "3px",
            height: "6px",
            borderRadius: "2px",
            background: "#2a2a2a",
            animation: "scrollBall 1.8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Text */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span
          style={{
            fontSize: "8px",
            color: "#1e1e1e",
            textAlign: "center",
            letterSpacing: "0.04em",
            lineHeight: 1.4,
            maxWidth: "60px",
          }}
        >
          Scroll to explore your journey
        </span>
        <span
          style={{
            fontSize: "8px",
            color: "#1e1e1e",
            textAlign: "center",
            letterSpacing: "0.04em",
          }}
        >
          One screen at a time
        </span>
        <div
          style={{ display: "flex", gap: "4px", marginTop: "2px" }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: "3px",
                height: "3px",
                borderRadius: "50%",
                background: "#1e1e1e",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
