import type { CurrentSelf } from "@/types/database";

import { CardShell } from "@/components/ui/card-shell";

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

export function IdentityClimatePanel({ currentSelf }: IdentityClimatePanelProps) {
  const paragraphs = currentSelf.summary.split(/\n\n+/).filter(Boolean);
  const recentGrowth = currentSelf.recent_growth ?? [];

  return (
    <CardShell variant="elevated" className="overflow-hidden">
      <div className="border-b border-[var(--ink-tertiary)]/10 bg-[var(--surface-muted)] px-6 py-4">
        <p className="text-label text-ink-tertiary">Who you are today</p>
        <time
          dateTime={currentSelf.updated_at}
          className="mt-1 block text-body-small text-ink-secondary"
        >
          Last updated {formatUpdatedAt(currentSelf.updated_at)}
        </time>
      </div>

      <div className="flex flex-col gap-8 p-6 sm:p-8">
        <section>
          <h3 className="text-quote text-ink-primary">{currentSelf.title}</h3>
          <div className="mt-4 flex flex-col gap-3">
            {paragraphs.map((para, i) => (
              <p key={i} className="text-body text-ink-secondary leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </section>

        {currentSelf.observations.length > 0 ? (
          <section aria-labelledby="current-observations">
            <h4 id="current-observations" className="text-label text-ink-tertiary">
              Core traits
            </h4>
            <ul className="mt-4 flex flex-col gap-2">
              {currentSelf.observations.map((trait) => (
                <li
                  key={trait}
                  className="flex items-baseline gap-2.5 text-body-small text-ink-secondary"
                >
                  <span className="shrink-0 text-ink-tertiary">·</span>
                  <span>{trait}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recentGrowth.length > 0 ? (
          <section aria-labelledby="current-growth">
            <h4 id="current-growth" className="text-label text-ink-tertiary">
              What&apos;s changing
            </h4>
            <ul className="mt-4 flex flex-col gap-2">
              {recentGrowth.map((item) => (
                <li
                  key={item}
                  className="flex items-baseline gap-2.5 text-body-small text-ink-secondary"
                >
                  <span className="shrink-0 text-ink-tertiary text-xs">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </CardShell>
  );
}
