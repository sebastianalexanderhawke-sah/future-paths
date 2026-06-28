import Link from "next/link";

import { signOut } from "@/actions/auth";

export function OverviewHeader() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #141414",
        zIndex: 200,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <span
        style={{
          color: "#fff",
          fontWeight: 700,
          fontSize: "15px",
          letterSpacing: "-0.3px",
        }}
      >
        Future Paths
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/situations/new"
          style={{
            backgroundColor: "#fff",
            color: "#000",
            borderRadius: "24px",
            padding: "9px 20px",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block",
            lineHeight: 1,
          }}
        >
          + New situation
        </Link>

        <form action={signOut} style={{ display: "flex", alignItems: "center" }}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#1e1e1e",
              border: "1px solid #2a2a2a",
              color: "#666",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            A
          </button>
        </form>
      </div>
    </header>
  );
}
