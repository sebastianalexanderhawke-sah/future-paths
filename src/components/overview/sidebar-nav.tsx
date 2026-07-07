"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

export type SidebarNavItem = {
  label: string;
  href: string;
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
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] transition-colors duration-150",
              isActive
                ? "bg-[#eef2ff] font-semibold text-[#6366f1]"
                : "font-medium text-[#666666] hover:bg-[#f5f5f5] hover:text-[#111]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="w-[18px] shrink-0 text-center text-[15px] leading-none"
            >
              {item.icon}
            </span>
            {item.label}
            {showDot(item) ? (
              <span className="ml-auto flex items-center" title="New activity">
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
