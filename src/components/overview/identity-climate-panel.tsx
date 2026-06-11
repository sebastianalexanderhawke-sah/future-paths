import type { CurrentSelf } from "@/types/database";
import type { ThemeName } from "@/types/enums";

import { CardShell } from "@/components/ui/card-shell";
import { ClimateBand } from "@/components/ui/climate-band";
import { ClimateHalo } from "@/components/ui/climate-halo";
import { ThemeChip } from "@/components/ui/theme-chip";
import { ThemeProminenceStrip } from "@/components/ui/theme-prominence-strip";

type IdentityClimatePanelProps = {
  currentSelf: CurrentSelf;
};

function formatUpdatedAt(updatedAt: string): string {
  return new Date(updatedAt).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function splitThemes(themes: ThemeName[]): {
  primaryTheme: ThemeName | null;
  supportingThemes: ThemeName[];
} {
  if (themes.length === 0) {
    return { primaryTheme: null, supportingThemes: [] };
  }

  return {
    primaryTheme: themes[0],
    supportingThemes: themes.slice(1),
  };
}

export function IdentityClimatePanel({ currentSelf }: IdentityClimatePanelProps) {
  const { primaryTheme, supportingThemes } = splitThemes(currentSelf.themes);

  return (
    <CardShell variant="elevated" className="overflow-hidden">
      <div className="border-b border-[var(--ink-tertiary)]/10 bg-[var(--surface-muted)] px-6 py-4">
        <p className="text-label text-ink-tertiary">Identity climate</p>
        <time
          dateTime={currentSelf.updated_at}
          className="mt-1 block text-body-small text-ink-secondary"
        >
          Last updated {formatUpdatedAt(currentSelf.updated_at)}
        </time>
      </div>

      <div className="flex flex-col gap-8 p-6 sm:p-8">
        {primaryTheme ? (
          <section aria-labelledby="primary-identity-signal">
            <h3 id="primary-identity-signal" className="text-label text-ink-tertiary">
              Primary identity signal
            </h3>
            <ClimateBand theme={primaryTheme} className="mt-4">
              <ThemeChip theme={primaryTheme} className="px-3 py-1 text-sm" />
            </ClimateBand>
          </section>
        ) : (
          <section aria-labelledby="primary-identity-signal">
            <h3 id="primary-identity-signal" className="text-label text-ink-tertiary">
              Primary identity signal
            </h3>
            <p className="mt-4 text-body-small text-ink-secondary">
              No themes are attached to your current self yet.
            </p>
          </section>
        )}

        {supportingThemes.length > 0 ? (
          <section aria-labelledby="supporting-identity-signals">
            <h3 id="supporting-identity-signals" className="text-label text-ink-tertiary">
              Supporting identity signals
            </h3>
            <div className="mt-4 flex flex-wrap gap-4">
              {supportingThemes.map((theme) => (
                <ClimateHalo key={theme} theme={theme}>
                  <ThemeChip theme={theme} />
                </ClimateHalo>
              ))}
            </div>
          </section>
        ) : null}

        {currentSelf.themes.length > 0 ? (
          <ThemeProminenceStrip themes={currentSelf.themes} />
        ) : null}

        <section aria-labelledby="current-narrative">
          <h3 id="current-narrative" className="text-label text-ink-tertiary">
            Current narrative
          </h3>
          <blockquote className="mt-4 text-quote text-ink-primary">
            {currentSelf.headline}
          </blockquote>
          <p className="mt-4 text-body text-ink-secondary">{currentSelf.summary}</p>
        </section>
      </div>
    </CardShell>
  );
}
