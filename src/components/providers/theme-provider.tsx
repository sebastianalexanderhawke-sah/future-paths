"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  // The product ships light-only: every screen is designed against the light
  // neutral palette, so honoring an OS dark preference produced a broken
  // hybrid (dark canvas behind light cards). Forced until a real dark theme
  // exists end to end.
  return (
    <NextThemesProvider
      attribute="class"
      forcedTheme="light"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
