import Link from "next/link";

type OverviewSectionProps = {
  label: string;
  title: React.ReactNode;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children?: React.ReactNode;
  className?: string;
};

export function OverviewSection({
  title,
  viewAllHref,
  viewAllLabel = "View all →",
  children,
}: OverviewSectionProps) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#2A2A2A",
            letterSpacing: "0.02em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {title}
        </span>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            style={{
              fontSize: "12px",
              color: "#1E1E1E",
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            className="hover:text-[#555]"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
