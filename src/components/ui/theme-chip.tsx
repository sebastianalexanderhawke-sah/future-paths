import type { ThemeName } from "@/types/enums";

import { getThemeCssVar } from "@/lib/design/theme-colors";

type ThemeChipProps = {
  theme: ThemeName;
  showDot?: boolean;
  className?: string;
};

export function ThemeChip({ theme, showDot = true, className = "" }: ThemeChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{
        backgroundColor: getThemeCssVar(theme, "soft"),
        color: getThemeCssVar(theme, "primary"),
      }}
    >
      {showDot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: getThemeCssVar(theme, "primary") }}
        />
      ) : null}
      {theme}
    </span>
  );
}
