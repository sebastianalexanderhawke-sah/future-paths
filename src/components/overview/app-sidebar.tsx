import Link from "next/link";

import { signOut } from "@/actions/auth";

// Finalized IA. Workspace is the entry point for reflections and check-ins;
// it points at the reflections route until a dedicated /workspace ships.
const NAV_ITEMS = [
  { label: "Overview", href: "/overview", icon: "⌂" },
  { label: "Current Self", href: "/current-self", icon: "◈" },
  { label: "Situations", href: "/moments", icon: "◧" },
  { label: "Workspace", href: "/reflections", icon: "✎" },
  { label: "Timeline", href: "/timeline", icon: "◷" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

type AppSidebarProps = {
  activeHref: string;
  unansweredReflections: number;
  /** Display name when set; falls back to a neutral label, never the email. */
  userLabel: string;
  userInitial: string;
};

export function AppSidebar({
  activeHref,
  unansweredReflections,
  userLabel,
  userInitial,
}: AppSidebarProps) {

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
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
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
              <span aria-hidden="true" className="w-[18px] shrink-0 text-center text-[15px] leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

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
