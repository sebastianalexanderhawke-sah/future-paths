import Link from "next/link";

type OverviewSectionProps = {
  label: string;
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
  className?: string;
};

export function OverviewSection({
  label,
  title,
  description,
  viewAllHref,
  viewAllLabel = "View all",
  children,
  className = "",
}: OverviewSectionProps) {
  return (
    <section className={["flex flex-col gap-[var(--space-card)]", className].join(" ")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label text-ink-tertiary">{label}</p>
          <h2 className="mt-2 text-h1 text-ink-primary">{title}</h2>
          {description ? (
            <p className="mt-1 text-body-small text-ink-secondary">{description}</p>
          ) : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="shrink-0 text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
