import type { CurrentSelf } from "@/types/database";
import type { ThemeName } from "@/types/enums";

import { CardShell } from "@/components/ui/card-shell";
import { Button } from "@/components/ui/button";
import { ThemeChip } from "@/components/ui/theme-chip";

type HeroCta = {
  href: string;
  label: string;
};

type OverviewHeroProps = {
  currentSelf: CurrentSelf | null;
  primaryCta: HeroCta;
  secondaryCta: HeroCta;
};

function formatUpdatedAt(updatedAt: string): string {
  return new Date(updatedAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function OverviewHero({ currentSelf, primaryCta, secondaryCta }: OverviewHeroProps) {
  const title = currentSelf?.headline ?? "Your current self is waiting to emerge";
  const themes: ThemeName[] = currentSelf?.themes ?? [];

  return (
    <CardShell variant="hero" className="flex flex-col gap-6 p-8">
      <div>
        <p className="text-label text-ink-tertiary">Current self</p>
        <h2 className="mt-3 text-display text-ink-primary">{title}</h2>
        {currentSelf ? (
          <p className="mt-3 text-body-small text-ink-tertiary">
            Last updated {formatUpdatedAt(currentSelf.updated_at)}
          </p>
        ) : (
          <p className="mt-3 text-body text-ink-secondary">
            Once you have moments, check-ins, and active futures, your identity summary
            will anchor this page.
          </p>
        )}
      </div>

      {themes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <ThemeChip key={theme} theme={theme} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button href={primaryCta.href} size="lg">
          {primaryCta.label}
        </Button>
        <Button href={secondaryCta.href} variant="secondary" size="lg">
          {secondaryCta.label}
        </Button>
      </div>
    </CardShell>
  );
}
