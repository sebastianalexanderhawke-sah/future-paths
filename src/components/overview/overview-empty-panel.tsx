type OverviewEmptyPanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function OverviewEmptyPanel({ children, className = "" }: OverviewEmptyPanelProps) {
  return (
    <div
      className={[
        "rounded-[var(--radius-card)] border border-dashed border-[var(--ink-tertiary)]/30 bg-[var(--surface-muted)] px-6 py-8 text-center text-body-small text-ink-secondary",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
