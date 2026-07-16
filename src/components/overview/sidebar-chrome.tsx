"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { SignOutForm } from "@/components/analytics/sign-out-form";
import { IconSparkle } from "@/components/icons";
import {
  readSidebarCollapsed,
  serverSidebarCollapsed,
  setSidebarCollapsed,
  subscribeSidebarCollapsed,
} from "@/components/overview/sidebar-state";

type SidebarChromeProps = {
  unansweredReflections: number;
  /** Display name when set; falls back to a neutral label, never the email. */
  userLabel: string;
  userInitial: string;
  /** The signOut server action, passed through from the server component. */
  signOutAction: () => Promise<void>;
  /** The navigation (server-rendered, streams its activity dots). */
  children: React.ReactNode;
};

/**
 * The sidebar's client chrome: the aside itself, the logo (which toggles
 * between the full 200px sidebar and a 68px icon rail), the needs-input
 * panel, and the user row. Navigation arrives as server children; SidebarNav
 * reads the same collapsed store, so the rail is one state everywhere.
 *
 * Collapsed, the rail keeps navigation whole — every destination, its active
 * pill, and its activity dot stay visible; only labels step back into hover
 * tooltips. The needs-input panel has no icon-width form, so it (and the
 * user label) yield to the Workspace nav dot until the sidebar expands.
 */
export function SidebarChrome({
  unansweredReflections,
  userLabel,
  userInitial,
  signOutAction,
  children,
}: SidebarChromeProps) {
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    serverSidebarCollapsed,
  );

  return (
    <aside
      data-collapsed={collapsed ? "true" : undefined}
      className={[
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-[#eeeeee] bg-white py-6",
        "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        collapsed ? "w-[68px]" : "w-[200px]",
      ].join(" ")}
    >
      {/* Skip link — the first tab stop on every shelled page. Visually
          hidden until keyboard focus lands on it (WCAG 2.4.1). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-[#111] focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      {/* Logo row — a gradient ring, not a filled disc. The RING is the
          rail toggle (named for what it does, so voice control and screen
          readers can invoke it); the wordmark is just the wordmark. */}
      <div
        className={[
          "mb-6 flex items-center gap-2.5 border-b border-[#f2f2f4] pb-6 pt-0.5",
          collapsed ? "justify-center px-0" : "px-5",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="focus-ring flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-80"
          style={{
            background:
              "conic-gradient(#6366f1, #8b5cf6, #10b981, #f59e0b, #6366f1)",
          }}
        >
          <span aria-hidden="true" className="h-[18px] w-[18px] rounded-full bg-white" />
        </button>
        {collapsed ? null : (
          <span className="whitespace-nowrap text-[15px] font-semibold text-[#111]">
            Reflection
          </span>
        )}
      </div>

      {/* Navigation (server-rendered; reads the same collapsed store). */}
      {children}

      {/* Bottom section */}
      <div
        className={[
          "mt-auto border-t border-[#f2f2f4] pt-5",
          collapsed ? "px-2" : "px-3.5",
        ].join(" ")}
      >
        {/* The needs-input panel has no 68px form; the Workspace nav dot
            carries the signal while the rail is collapsed. */}
        {!collapsed ? (
          <div className="mb-4 rounded-xl bg-[#f8f7ff] p-4">
            <div aria-hidden="true" className="mb-2 text-[#7c3aed]">
              <IconSparkle size={16} />
            </div>
            <p className="text-[11px] font-medium text-[#6b6b6b]">
              Needs your input
            </p>
            {unansweredReflections > 0 ? (
              <>
                <p className="mb-0.5 mt-1 text-[28px] font-extrabold leading-none tracking-[-1px] text-[#111]">
                  {unansweredReflections}
                </p>
                <p className="mb-3 text-[11px] leading-snug text-[#6b6b6b]">
                  item{unansweredReflections !== 1 ? "s" : ""} need
                  {unansweredReflections === 1 ? "s" : ""} your attention
                </p>
                <Link
                  href="/reflections"
                  aria-label="Continue in the Workspace"
                  className="block w-full rounded-lg bg-[#111] py-[9px] text-center text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                >
                  Continue
                </Link>
              </>
            ) : (
              <p className="mt-1 text-[12px] leading-relaxed text-[#6b6b6b]">
                You&apos;re all caught up.
              </p>
            )}
          </div>
        ) : null}

        {/* User row. Expanded, the avatar and name are identity, not a
            control — only the explicit "Sign out" line submits, so clicking
            your own name never ends the session. Collapsed there is no room
            for a separate line, so the avatar is the (labeled) control. */}
        {collapsed ? (
          <SignOutForm action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="focus-ring flex w-full cursor-pointer items-center justify-center rounded-[10px] p-1.5 text-left transition-colors duration-150 hover:bg-[#f5f5f5]"
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
              <span className="sr-only">Sign out</span>
            </button>
          </SignOutForm>
        ) : (
          <div className="flex w-full items-center gap-2.5 rounded-[10px] p-2.5">
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
              <SignOutForm action={signOutAction}>
                <button
                  type="submit"
                  className="focus-ring block cursor-pointer rounded-sm text-[11px] text-[#6b6b6b] transition-colors duration-150 hover:text-[#111] hover:underline"
                >
                  Sign out
                </button>
              </SignOutForm>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
