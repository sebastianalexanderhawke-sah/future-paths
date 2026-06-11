import type { ThemeName } from "@/types/enums";

import { getThemeCssVar } from "@/lib/design/theme-colors";

type ClimateHaloProps = {
  theme: ThemeName;
  children: React.ReactNode;
  className?: string;
};

export function ClimateHalo({ theme, children, className = "" }: ClimateHaloProps) {
  return (
    <div
      className={[
        "inline-flex rounded-full border border-dashed p-1.5",
        className,
      ].join(" ")}
      style={{ borderColor: getThemeCssVar(theme, "primary") }}
    >
      {children}
    </div>
  );
}
