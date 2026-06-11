import Link from "next/link";

import { CardShell } from "@/components/ui/card-shell";
import { TensionBridge } from "@/components/ui/tension-bridge";
import { ThemeChip } from "@/components/ui/theme-chip";
import type { Contradiction } from "@/types/database";
import type { ThemeName } from "@/types/enums";

const TYPE_LABELS: Record<Contradiction["contradiction_type"], string> = {
  current_vs_future: "Current vs future",
  dual_future: "Dual future",
  stated_vs_lived: "Stated vs lived",
};

const STATUS_PRESENTATION: Record<
  Contradiction["status"],
  { cardClass: string; badgeClass: string }
> = {
  active: {
    cardClass: "",
    badgeClass: "text-[var(--state-contradiction-detected)]",
  },
  softened: {
    cardClass: "opacity-95",
    badgeClass: "text-[var(--state-contradiction-detected)]",
  },
  resolved: {
    cardClass: "opacity-90",
    badgeClass: "text-[var(--state-contradiction-resolved)]",
  },
  faded: {
    cardClass: "opacity-75",
    badgeClass: "text-[var(--state-weakened)]",
  },
};

type ContradictionPoleBridgeCardProps = {
  contradiction: Contradiction;
};

type PolePanelProps = {
  label: string;
  text: string;
  theme?: ThemeName;
};

function PolePanel({ label, text, theme }: PolePanelProps) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] p-4">
      <p className="text-label text-ink-tertiary">{label}</p>
      <p className="flex-1 text-body text-ink-primary">{text}</p>
      {theme ? <ThemeChip theme={theme} /> : null}
    </div>
  );
}

export function ContradictionPoleBridgeCard({ contradiction }: ContradictionPoleBridgeCardProps) {
  const presentation = STATUS_PRESENTATION[contradiction.status];
  const poleATheme = contradiction.themes[0];
  const poleBTheme = contradiction.themes[1];
  const bridgeThemes = contradiction.themes.slice(2);
  const poleGapClass =
    contradiction.status === "resolved" || contradiction.status === "faded"
      ? "gap-3 sm:gap-4"
      : "gap-4 sm:gap-6";

  return (
    <CardShell
      variant="elevated"
      className={["overflow-hidden", presentation.cardClass].join(" ")}
    >
      <Link
        href={`/contradictions/${contradiction.id}`}
        className="block p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label text-ink-tertiary">
            {TYPE_LABELS[contradiction.contradiction_type]}
          </p>
          <p className={["text-label capitalize", presentation.badgeClass].join(" ")}>
            {contradiction.status}
          </p>
        </div>

        <h3 className="mt-4 text-h2 text-ink-primary">{contradiction.title}</h3>
        <p className="mt-3 text-body text-ink-secondary">{contradiction.summary}</p>

        <div className={["mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr]", poleGapClass].join(" ")}>
          <PolePanel label="Pole A" text={contradiction.pole_a} theme={poleATheme} />
          <TensionBridge intensity={contradiction.intensity} status={contradiction.status} />
          <PolePanel label="Pole B" text={contradiction.pole_b} theme={poleBTheme} />
        </div>

        {bridgeThemes.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {bridgeThemes.map((theme) => (
              <ThemeChip key={theme} theme={theme} />
            ))}
          </div>
        ) : null}
      </Link>
    </CardShell>
  );
}
