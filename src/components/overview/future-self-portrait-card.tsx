import type { FutureSelf } from "@/types/database";
import type { FutureSelfStage, ThemeName } from "@/types/enums";

import { CardShell } from "@/components/ui/card-shell";
import { MomentumRing } from "@/components/ui/momentum-ring";
import { ThemeChip } from "@/components/ui/theme-chip";
import { getThemeCssVar } from "@/lib/design/theme-colors";

const STAGE_LABELS: Record<FutureSelfStage, string> = {
  possible: "Possible",
  emerging: "Emerging",
  future_self: "Future self",
};

type FutureSelfPortraitCardProps = {
  futureSelf: FutureSelf;
  featured?: boolean;
  className?: string;
};

function getDominantTheme(themes: ThemeName[]): ThemeName {
  return themes[0] ?? "Reflection";
}

export function FutureSelfPortraitCard({
  futureSelf,
  featured = false,
  className = "",
}: FutureSelfPortraitCardProps) {
  const isFaded = futureSelf.status === "faded";
  const dominantTheme = getDominantTheme(futureSelf.themes);
  const visibleThemes = futureSelf.themes.slice(0, 3);

  return (
    <CardShell
      variant="hero"
      className={[
        "flex h-full min-h-[22rem] w-[72vw] max-w-[20rem] flex-col overflow-hidden sm:min-w-[18rem] sm:max-w-[21rem]",
        featured ? "ring-1 ring-[var(--action-ring)]" : "",
        isFaded ? "opacity-75" : "",
        className,
      ].join(" ")}
    >
      <div
        className="relative min-h-[9.5rem] shrink-0"
        style={{
          background: `linear-gradient(180deg, ${getThemeCssVar(dominantTheme, "soft")} 0%, color-mix(in srgb, ${getThemeCssVar(dominantTheme, "primary")} 22%, transparent) 100%)`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center pt-4">
          <MomentumRing
            momentum={futureSelf.momentum}
            faded={isFaded}
            label={isFaded ? "Faded" : STAGE_LABELS[futureSelf.stage]}
            id={`momentum-ring-${futureSelf.id}`}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <p className="text-label text-ink-tertiary">{STAGE_LABELS[futureSelf.stage]}</p>
          <h3 className="mt-2 text-h1 text-ink-primary">{futureSelf.name}</h3>
        </div>

        <p className="line-clamp-4 flex-1 text-body text-ink-secondary">
          {futureSelf.description}
        </p>

        {visibleThemes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleThemes.map((theme) => (
              <ThemeChip key={theme} theme={theme} />
            ))}
            {futureSelf.themes.length > 3 ? (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs text-ink-tertiary">
                +{futureSelf.themes.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </CardShell>
  );
}
