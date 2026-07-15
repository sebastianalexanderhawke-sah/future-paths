/**
 * The sidebar rail's one piece of shared client state: whether the sidebar
 * is collapsed to its icon rail. Persisted in localStorage — the sidebar's
 * existing persistence mechanism (the `fp:seen:` visit markers live there
 * too) — and exposed as a tiny external store so SidebarChrome (the aside)
 * and SidebarNav (the links) stay in sync without threading context through
 * the server components between them.
 *
 * The server snapshot is always `false` (expanded): pages render expanded
 * markup, and a collapsed preference applies at first client render —
 * instantly on in-app navigations, one frame after hydration on hard loads.
 */

const STORAGE_KEY = "fp:sidebar-collapsed";

const listeners = new Set<() => void>();

let cached: boolean | undefined;

export function subscribeSidebarCollapsed(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readSidebarCollapsed(): boolean {
  if (cached === undefined) {
    try {
      cached = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Storage unavailable — the rail simply won't remember.
      cached = false;
    }
  }
  return cached;
}

export function serverSidebarCollapsed(): boolean {
  return false;
}

export function setSidebarCollapsed(collapsed: boolean): void {
  cached = collapsed;
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Still collapses for this page; the preference just won't persist.
  }
  for (const listener of listeners) listener();
}
