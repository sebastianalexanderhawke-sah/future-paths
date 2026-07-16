"use client";

import { useEffect, useState } from "react";

import { useTheme } from "@/components/providers/theme-provider";

const OPTIONS = [
  {
    value: "light",
    label: "Light",
    description: "The classic Reflection look.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easier on the eyes at night.",
  },
  {
    value: "system",
    label: "System",
    description: "Follows your device setting.",
  },
] as const;

/**
 * Theme picker for the Settings Appearance card. Radio cards in the same
 * idiom as the situation entry flow's goal choice; ThemeProvider stores the
 * selection in localStorage, so it persists across sessions, and "system"
 * tracks the OS preference live.
 */
export function AppearanceControl() {
  // The stored theme is only known on the client. Until mounted, render
  // the three options without a selection instead of guessing — a wrong
  // pre-hydration checkmark would flicker.
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? (theme ?? "light") : null;

  return (
    <fieldset>
      <legend className="sr-only">Color theme</legend>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
          >
            <input
              type="radio"
              name="appearance-theme"
              value={option.value}
              checked={current === option.value}
              onChange={() => setTheme(option.value)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-zinc-900">
                {option.label}
              </span>
              <span className="mt-0.5 block text-sm text-zinc-500">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
