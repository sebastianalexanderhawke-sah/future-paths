import { formatScannablePath } from "@/components/home/output-refinement";
import { CardShell } from "@/components/ui/card-shell";
import { ThemeChip } from "@/components/ui/theme-chip";
import type { Path } from "@/types/database";

type BulletListProps = { items: string[] };
function BulletList({ items }: BulletListProps) {
  const nonEmpty = items.filter((item) => item.trim().length > 0);
  if (nonEmpty.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-1.5">
      {nonEmpty.map((item) => (
        <li key={item} className="flex gap-2 text-body-small text-ink-secondary">
          <span aria-hidden="true" className="text-ink-tertiary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PathDetails({
  path,
  index,
  showThemes = true,
}: {
  path: Path;
  index: number;
  showThemes?: boolean;
}) {
  const scannable = formatScannablePath(path, index);

  return (
    <>
      {scannable.explanation ? (
        <p className="mt-1.5 text-body-small text-ink-secondary">{scannable.explanation}</p>
      ) : null}

      {showThemes && path.themes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {path.themes.map((theme) => (
            <ThemeChip key={theme} theme={theme} />
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {scannable.benefits.length > 0 ? (
          <div>
            <p className="text-label text-[var(--state-strengthened)]">Benefits</p>
            <BulletList items={scannable.benefits} />
          </div>
        ) : null}

        {scannable.consequences.length > 0 ? (
          <div>
            <p className="text-label text-[var(--state-contradiction-detected)]">Consequences</p>
            <BulletList items={scannable.consequences} />
          </div>
        ) : null}

        {scannable.futureYou ? (
          <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
            <p className="text-label text-ink-tertiary">Future you</p>
            <p className="mt-1 text-body-small text-ink-primary">
              {scannable.futureYou.replace(/[:;,\s]+$/, "")}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ── Chosen path (fully expanded) ─────────────────────────────────────────────

type ChosenPathCardProps = { path: Path; index?: number };

export function ChosenPathCard({ path, index = 0 }: ChosenPathCardProps) {
  const scannable = formatScannablePath(path, index);

  return (
    <CardShell variant="elevated" className="flex flex-col p-4 sm:p-5 ring-2 ring-[var(--action-fill)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-h2 text-ink-primary">{scannable.title}</h3>
        <span className="shrink-0 rounded-full bg-[var(--state-strengthened)]/15 px-2.5 py-0.5 text-label text-[var(--state-strengthened)]">
          Your path
        </span>
      </div>

      <PathDetails path={path} index={index} />
    </CardShell>
  );
}

// ── Non-chosen path (collapsed, inner expandable) ────────────────────────────

type OtherPathCardProps = { path: Path; index: number };

export function OtherPathCard({ path, index }: OtherPathCardProps) {
  const scannable = formatScannablePath(path, index);

  return (
    <CardShell variant="elevated" className="overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-muted)] sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-ink-tertiary">Option {index + 1}</span>
            <h4 className="text-body text-ink-primary">{scannable.title}</h4>
            {path.themes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {path.themes.map((theme) => (
                  <ThemeChip key={theme} theme={theme} showDot={false} />
                ))}
              </div>
            ) : null}
          </div>
          <span aria-hidden="true" className="mt-1 shrink-0 text-sm text-ink-tertiary">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>

        <div className="border-t border-[var(--ink-tertiary)]/10 px-4 pb-4 pt-3 sm:px-5">
          <PathDetails path={path} index={index} showThemes={false} />
        </div>
      </details>
    </CardShell>
  );
}
