"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import {
  IconBriefcase,
  IconClock,
  IconGear,
  IconHome,
  IconPenLine,
  IconUser,
} from "@/components/icons";
import {
  readSidebarCollapsed,
  serverSidebarCollapsed,
  subscribeSidebarCollapsed,
} from "@/components/overview/sidebar-state";

// Icon components resolved here (client side) from a string key, because
// the server-rendered AppSidebar can't pass component functions across the
// client boundary.
const NAV_ICONS: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  overview: IconHome,
  "current-self": IconUser,
  situations: IconBriefcase,
  workspace: IconPenLine,
  timeline: IconClock,
  settings: IconGear,
};

export type SidebarNavItem = {
  label: string;
  href: string;
  /** Key into the nav icon set (e.g. "overview", "timeline"). */
  icon: string;
  /**
   * When the page's content last changed (ISO). A subtle dot shows while
   * that moment is newer than the reader's last visit to the page.
   */
  activityAt?: string | null;
  /** Overrides timestamp logic: show the dot while true (e.g. work waiting). */
  hasUpdates?: boolean;
};

const SEEN_PREFIX = "fp:seen:";

// Read once per page load and cached, mirroring the overview visit-marker
// pattern: the snapshot stays referentially stable across renders and the
// server snapshot is null, so dots only ever appear after hydration.
let cachedSeen: Record<string, number> | null | undefined;

function readSeen(): Record<string, number> | null {
  if (cachedSeen === undefined) {
    try {
      const seen: Record<string, number> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(SEEN_PREFIX)) continue;
        const parsed = Date.parse(localStorage.getItem(key) ?? "");
        if (!Number.isNaN(parsed)) seen[key.slice(SEEN_PREFIX.length)] = parsed;
      }
      cachedSeen = seen;
    } catch {
      cachedSeen = null;
    }
  }
  return cachedSeen;
}

const emptySubscribe = () => () => {};

type SidebarNavProps = {
  items: SidebarNavItem[];
  activeHref: string;
};

export function SidebarNav({ items, activeHref }: SidebarNavProps) {
  const seen = useSyncExternalStore(emptySubscribe, readSeen, () => null);
  // The rail state SidebarChrome toggles: collapsed, links shrink to their
  // icons — active pill and activity dot preserved — and labels move into
  // hover tooltips.
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    serverSidebarCollapsed,
  );

  // Visiting a page marks it seen. The cached snapshot above is per-load, so
  // the dot on the page being read disappears without hiding sibling dots.
  useEffect(() => {
    try {
      localStorage.setItem(
        `${SEEN_PREFIX}${activeHref}`,
        new Date().toISOString(),
      );
    } catch {
      // Storage unavailable — dots simply won't personalize.
    }
  }, [activeHref]);

  const showDot = (item: SidebarNavItem): boolean => {
    if (item.href === activeHref) return false;
    if (item.hasUpdates) return true;
    if (!item.activityAt || seen === null) return false;
    const at = Date.parse(item.activityAt);
    const seenAt = seen[item.href];
    // No marker yet means the reader has never opened the page — stay quiet
    // rather than greeting a first-time user with a row of dots.
    return seenAt !== undefined && !Number.isNaN(at) && at > seenAt;
  };

  return (
    <nav className={`flex flex-col gap-1 ${collapsed ? "px-2" : "px-3"}`}>
      {items.map((item) => {
        const isActive = item.href === activeHref;
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "group/item relative flex items-center whitespace-nowrap rounded-[10px] py-3 text-[13px] transition-colors duration-150",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              isActive
                ? "bg-[#f5f3ff] font-semibold text-[#111]"
                : "font-medium text-[#666666] hover:bg-[#f5f5f5] hover:text-[#111]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={`flex w-[18px] shrink-0 justify-center ${
                isActive ? "text-[#7c3aed]" : "text-[#9ca3af]"
              }`}
            >
              {Icon ? <Icon size={16} /> : null}
            </span>
            {collapsed ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              item.label
            )}
            {/* The label as a hover tooltip while the rail is collapsed. */}
            {collapsed ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#111] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg group-hover/item:block"
              >
                {item.label}
              </span>
            ) : null}
            {showDot(item) ? (
              <span
                className={
                  collapsed
                    ? "absolute right-1.5 top-1.5 flex items-center"
                    : "ml-auto flex items-center"
                }
                title="New activity"
              >
                <span className="h-[6px] w-[6px] rounded-full bg-[#6366f1] opacity-70" />
                <span className="sr-only">New activity</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
