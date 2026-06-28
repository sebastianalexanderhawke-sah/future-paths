import { OverviewScrollHint } from "./overview-scroll-hint";
import { OverviewSidebar } from "./overview-sidebar";

type OverviewPageShellProps = {
  header: React.ReactNode;
  children: React.ReactNode;
};

export function OverviewPageShell({ header, children }: OverviewPageShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        overflowX: "hidden",
      }}
    >
      {header}
      <OverviewSidebar />
      <OverviewScrollHint />

      <main
        style={{
          marginLeft: "180px",
          marginRight: "60px",
          paddingTop: "56px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        }}
      >
        {children}
      </main>
    </div>
  );
}
