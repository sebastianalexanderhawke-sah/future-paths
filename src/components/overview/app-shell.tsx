import { AppSidebar } from "@/components/overview/app-sidebar";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { getUserIdentity } from "@/lib/user-identity";

type AppShellProps = {
  /** Sidebar item to highlight; pass the page's own path when none applies. */
  activeHref: string;
  children: React.ReactNode;
};

/**
 * The one application frame: sidebar plus the standard scrolling content
 * column. Every protected page renders inside this shell so navigation,
 * spacing, and the reflection badge behave identically everywhere.
 */
export async function AppShell({ activeHref, children }: AppShellProps) {
  const [userIdentity, reflectionSummaryResult] = await Promise.all([
    getUserIdentity(),
    getUnansweredReflectionSummary(),
  ]);

  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref={activeHref}
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">{children}</div>
      </main>
    </div>
  );
}
