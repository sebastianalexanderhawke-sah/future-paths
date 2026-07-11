"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Light, dark, and system are all real now: the .dark token block plus the
  // generated dark-theme.css cover every screen, so the old forcedTheme
  // guard is gone. Default stays "light" — existing users designed their
  // habits around the light product, and dark is one Settings visit away.
  // next-themes persists the choice in localStorage across sessions and
  // resolves "system" against the OS preference (live, via media query).
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
