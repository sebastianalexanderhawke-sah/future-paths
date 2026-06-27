type OverviewPageShellProps = {
  header: React.ReactNode;
  children: React.ReactNode;
};

export function OverviewPageShell({ header, children }: OverviewPageShellProps) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#060606" }}>
      {header}
      <main
        style={{
          maxWidth: "620px",
          margin: "0 auto",
          padding: "0 18px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
      </main>
    </div>
  );
}
