"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";

/**
 * Same localStorage key next-themes used, so choices made before the
 * migration carry over untouched. THEME_INIT_SCRIPT in the root layout
 * reads this key and applies the class before first paint — keep the two
 * in sync if the key or resolution rules ever change.
 */
const STORAGE_KEY = "theme";
const THEMES: readonly Theme[] = ["light", "dark", "system"];

type ThemeContextValue = {
  /** The stored choice ("system" stays "system"), undefined until mounted —
      the server can't know localStorage, and a guessed selection would
      flicker. */
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
};

// A default value instead of a required provider: Settings render tests
// mount AppearanceControl standalone.
const ThemeContext = createContext<ThemeContextValue>({
  theme: undefined,
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStored(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored as Theme) ? (stored as Theme) : "light";
  } catch {
    return "light";
  }
}

/** Resolves and applies a theme to <html>: the class the CSS keys off,
    plus colorScheme so native UI (scrollbars, form controls) follows. */
function apply(theme: Theme) {
  const resolved = theme === "system" ? systemTheme() : theme;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

/** Suspends every CSS transition for one paint while the theme flips, so
    surfaces snap between palettes instead of cross-fading one by one. */
function applyWithoutTransitions(theme: Theme) {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important}",
    ),
  );
  document.head.appendChild(style);
  apply(theme);
  // Force a reflow so the no-transition rule is in effect for the flip,
  // then let it go on the next tick.
  window.getComputedStyle(document.documentElement);
  window.setTimeout(() => document.head.removeChild(style), 1);
}

/**
 * The app's own light/dark/system provider. It replaced next-themes, which
 * rendered its init <script> from inside this client component — a pattern
 * React 19.2 warns about on every client render. The pre-paint script now
 * lives in the server root layout (THEME_INIT_SCRIPT); this provider only
 * owns the live state: Settings changes, OS-preference tracking for
 * "system", and cross-tab sync.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    setThemeState(readStored());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (private mode); the theme still applies
      // for this visit.
    }
    applyWithoutTransitions(next);
  }, []);

  // "system" tracks the OS preference live.
  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  // A choice made in another tab lands here too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readStored();
      setThemeState(next);
      apply(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
