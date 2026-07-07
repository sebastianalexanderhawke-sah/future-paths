import Link from "next/link";
import { Suspense } from "react";

import { signOut } from "@/actions/auth";
import { SidebarNav, type SidebarNavItem } from "@/components/overview/sidebar-nav";
import { getNavActivity } from "@/lib/nav-activity";

type AppSidebarProps = {
  activeHref: string;
  unansweredReflections: number;
  /** Display name when set; falls back to a neutral label, never the email. */
  userLabel: string;
  userInitial: string;
};

// Finalized IA. Workspace is the entry point for reflections and check-ins;
// it points at the reflections route until a dedicated /workspace ships.
// Unseen-update dots: Workspace shows one while work is actually waiting;
// Current Self and Timeline show one when their content changed since the
// reader last opened them.
function baseNavItems(unansweredReflections: number): SidebarNavItem[] {
  return [
    { label: "Overview", href: "/overview", icon: "⌂" },
    { label: "Current Self", href: "/current-self", icon: "◈" },
    { label: "Situations", href: "/moments", icon: "◧" },
    {
      label: "Workspace",
      href: "/reflections",
      icon: "✎",
      hasUpdates: unansweredReflections > 0,
    },
    { label: "Timeline", href: "/timeline", icon: "◷" },
    { label: "Settings", href: "/settings", icon: "⚙" },
  ];
}

// Async wrapper so the two activity-timestamp lookups stream in behind a
// Suspense boundary: the nav paints immediately (dots appear when the data
// lands) and the page render never blocks on the sidebar.
async function NavWithActivity({
  items,
  activeHref,
}: {
  items: SidebarNavItem[];
  activeHref: string;
}) {
  const activity = await getNavActivity();
  const enriched = items.map((item) => {
    if (item.href === "/current-self")
      return { ...item, activityAt: activity.currentSelfAt };
    if (item.href === "/timeline")
      return { ...item, activityAt: activity.timelineAt };
    return item;
  });
  return <SidebarNav items={enriched} activeHref={activeHref} />;
}

export function AppSidebar({
  activeHref,
  unansweredReflections,
  userLabel,
  userInitial,
}: AppSidebarProps) {
  const navItems = baseNavItems(unansweredReflections);

  return (
    <aside className="sticky top-0 flex h-screen w-[200px] shrink-0 flex-col overflow-hidden border-r border-[#eeeeee] bg-white py-6">
      {/* Logo */}
      <div className="mx-0 mb-6 flex items-center gap-2.5 border-b border-[#f2f2f4] px-5 pb-6 pt-0.5">
        <span
          aria-hidden="true"
          className="h-8 w-8 shrink-0 rounded-full"
          style={{
            background: "conic-gradient(#6366f1, #22c55e, #f59e0b, #6366f1)",
          }}
        />
        <span className="text-[15px] font-semibold text-[#111]">
          Future Paths
        </span>
      </div>

      {/* Navigation */}
      <Suspense fallback={<SidebarNav items={navItems} activeHref={activeHref} />}>
        <NavWithActivity items={navItems} activeHref={activeHref} />
      </Suspense>

      {/* Bottom section */}
      <div className="mt-auto border-t border-[#f2f2f4] px-3.5 pt-5">
        <div className="mb-4 rounded-xl bg-[#f8f7ff] p-4">
          <div aria-hidden="true" className="mb-1.5 text-[18px] leading-none text-[#6366f1]">
            ✦
          </div>
          <p className="text-[11px] font-medium text-[#888888]">
            Today&apos;s Focus
          </p>
          {unansweredReflections > 0 ? (
            <>
              <p className="mb-0.5 text-[28px] font-extrabold leading-none tracking-[-1px] text-[#111]">
                {unansweredReflections}
              </p>
              <p className="mb-2.5 text-[11px] text-[#888888]">
                action{unansweredReflections !== 1 ? "s" : ""} waiting
              </p>
              <Link
                href="/reflections"
                className="block w-full rounded-lg bg-[#111] py-[9px] text-center text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
              >
                Continue
              </Link>
            </>
          ) : (
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#888888]">
              You&apos;re all caught up.
            </p>
          )}
        </div>

        {/* User row — signs out */}
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] p-2.5 text-left transition-colors duration-150 hover:bg-[#f5f5f5]"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            >
              {userInitial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-[#111]">
                {userLabel}
              </span>
              <span className="block text-[11px] text-[#888888]">Sign out</span>
            </span>
            <span aria-hidden="true" className="ml-auto text-[#cccccc]">
              ›
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}
