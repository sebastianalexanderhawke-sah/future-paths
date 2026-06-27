import Link from "next/link";

import { signOut } from "@/actions/auth";

export function OverviewHeader() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "54px",
        padding: "0 18px",
        backgroundColor: "#060606",
        borderBottom: "1px solid #0F0F0F",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Logo */}
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

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Avatar circle */}
        <form action={signOut} style={{ display: "flex", alignItems: "center" }}>
          <button
            type="submit"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#141414",
              border: "1px solid #1A1A1A",
              cursor: "pointer",
              padding: 0,
            }}
            title="Sign out"
            aria-label="Sign out"
          />
        </form>

        {/* New situation button */}
        <Link
          href="/situations/new"
          style={{
            backgroundColor: "#fff",
            color: "#000",
            borderRadius: "20px",
            padding: "7px 16px",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block",
            lineHeight: 1,
          }}
        >
          New situation
        </Link>
      </div>
    </header>
  );
}
