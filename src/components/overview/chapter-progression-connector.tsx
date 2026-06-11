type ChapterProgressionConnectorProps = {
  className?: string;
};

export function ChapterProgressionConnector({ className = "" }: ChapterProgressionConnectorProps) {
  return (
    <div
      className={["flex flex-col items-center py-2", className].join(" ")}
      aria-hidden="true"
    >
      <div className="h-6 w-px bg-gradient-to-b from-[var(--ink-tertiary)]/40 to-[var(--ink-tertiary)]/10" />
      <span className="my-1 text-body-small text-ink-tertiary">↓</span>
      <div className="h-6 w-px bg-gradient-to-b from-[var(--ink-tertiary)]/10 to-[var(--ink-tertiary)]/40" />
    </div>
  );
}
