import type { ThemeName } from "@/types/enums";

import { getThemeCssVar } from "@/lib/design/theme-colors";

const PROMINENCE_SIZES = ["size-4", "size-3", "size-2.5"] as const;

type ThemeProminenceStripProps = {
  themes: ThemeName[];
  className?: string;
};

export function ThemeProminenceStrip({ themes, className = "" }: ThemeProminenceStripProps) {
  if (themes.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <p className="text-label text-ink-tertiary">Theme prominence</p>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        {themes.map((theme, index) => {
          const sizeClass = PROMINENCE_SIZES[Math.min(index, PROMINENCE_SIZES.length - 1)];

          return (
            <div key={theme} className="flex flex-col items-center gap-2">
              <span
                aria-hidden="true"
                className={["rounded-full", sizeClass].join(" ")}
                style={{ backgroundColor: getThemeCssVar(theme, "primary") }}
              />
              <span className="text-body-small text-ink-secondary">{theme}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-body-small text-ink-tertiary">
        Relative size reflects theme order in your current self — not a score.
      </p>
    </div>
  );
}
