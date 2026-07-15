import { Suspense } from "react";

import { signOut } from "@/actions/auth";
import { SidebarChrome } from "@/components/overview/sidebar-chrome";
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
    { label: "Overview", href: "/overview", icon: "overview" },
    { label: "Current Self", href: "/current-self", icon: "current-self" },
    { label: "Situations", href: "/moments", icon: "situations" },
    {
      label: "Workspace",
      href: "/reflections",
      icon: "workspace",
      hasUpdates: unansweredReflections > 0,
    },
    { label: "Timeline", href: "/timeline", icon: "timeline" },
    { label: "Settings", href: "/settings", icon: "settings" },
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

/**
 * The application sidebar: a server component that assembles the nav data
 * and streams activity dots, wrapped in SidebarChrome (client), which owns
 * the collapsible rail — full 200px sidebar or 68px icon rail, toggled by
 * the logo and remembered in localStorage.
 */
export function AppSidebar({
  activeHref,
  unansweredReflections,
  userLabel,
  userInitial,
}: AppSidebarProps) {
  const navItems = baseNavItems(unansweredReflections);

  return (
    <SidebarChrome
      unansweredReflections={unansweredReflections}
      userLabel={userLabel}
      userInitial={userInitial}
      signOutAction={signOut}
    >
      <Suspense fallback={<SidebarNav items={navItems} activeHref={activeHref} />}>
        <NavWithActivity items={navItems} activeHref={activeHref} />
      </Suspense>
    </SidebarChrome>
  );
}
