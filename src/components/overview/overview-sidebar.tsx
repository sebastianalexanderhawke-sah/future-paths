"use client";

import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Overview", anchor: "top" },
  { label: "Current Self", anchor: "self" },
  { label: "Situations", anchor: "situations" },
  { label: "Future Selves", anchor: "future-selves" },
  { label: "Timeline", anchor: "timeline" },
  { label: "Insights", anchor: "" },
];

export function OverviewSidebar() {
  const [active, setActive] = useState("top");

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.anchor).filter(Boolean);

    function update() {
      let current = "top";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 100) {
          current = id;
        }
      }
      setActive(current);
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        top: "56px",
        bottom: 0,
        width: "180px",
        background: "#0a0a0a",
        borderRight: "1px solid #0f0f0f",
        padding: "36px 20px",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {NAV_LINKS.map((link, i) => {
        const isActive = active === link.anchor;
        return (
          <div key={link.label}>
            <a
              href={link.anchor ? `#${link.anchor}` : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textDecoration: "none",
                color: isActive ? "#fff" : "#2e2e2e",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLAnchorElement).style.color = "#666";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLAnchorElement).style.color = "#2e2e2e";
              }}
              onClick={(e) => {
                if (!link.anchor) e.preventDefault();
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isActive ? "#8b7cf8" : "#0a0a0a",
                  border: `1px solid ${isActive ? "#8b7cf8" : "#2a2a2a"}`,
                  boxShadow: isActive ? "0 0 6px rgba(139,124,248,0.4)" : "none",
                  transition: "all 0.2s",
                }}
              />
              <span style={{ fontSize: "13px", fontWeight: 500 }}>
                {link.label}
              </span>
            </a>
            {i < NAV_LINKS.length - 1 && (
              <div
                style={{
                  width: "1px",
                  height: "20px",
                  background: "#111",
                  marginLeft: "22.5px",
                  marginTop: "2px",
                  marginBottom: "2px",
                }}
              />
            )}
          </div>
        );
      })}

      <div
        style={{
          marginTop: "auto",
          color: "#2a2a2a",
          fontSize: "16px",
          textAlign: "center",
          paddingBottom: "8px",
        }}
      >
        ∨
      </div>
    </nav>
  );
}
