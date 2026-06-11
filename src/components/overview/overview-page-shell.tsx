type OverviewPageShellProps = {
  header: React.ReactNode;
  children: React.ReactNode;
};

export function OverviewPageShell({ header, children }: OverviewPageShellProps) {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      {header}
      <main className="mx-auto flex w-full max-w-[70rem] flex-1 flex-col gap-[var(--space-section)] px-6 py-12">
        {children}
      </main>
    </div>
  );
}
