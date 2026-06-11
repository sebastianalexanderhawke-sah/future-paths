import type { ThemeName } from "@/types/enums";

import { getThemeCssVar } from "@/lib/design/theme-colors";

type ClimateBandProps = {
  theme: ThemeName;
  children: React.ReactNode;
  className?: string;
};

export function ClimateBand({ theme, children, className = "" }: ClimateBandProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--ink-tertiary)]/10 border-l-[3px] px-4 py-4 pl-5",
        className,
      ].join(" ")}
      style={{
        backgroundColor: getThemeCssVar(theme, "soft"),
        borderLeftColor: getThemeCssVar(theme, "primary"),
      }}
    >
      {children}
    </div>
  );
}
