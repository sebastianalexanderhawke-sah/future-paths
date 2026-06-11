import type { ContradictionStatus } from "@/types/enums";

type TensionBridgeProps = {
  intensity: number;
  status: ContradictionStatus;
  className?: string;
};

const STATUS_BRIDGE_CLASS: Record<ContradictionStatus, string> = {
  active: "from-[var(--state-contradiction-detected)]/40 via-[var(--state-contradiction-detected)]/25 to-[var(--state-contradiction-detected)]/40",
  softened:
    "from-[var(--state-contradiction-resolved)]/30 via-[var(--state-contradiction-detected)]/15 to-[var(--state-contradiction-resolved)]/30",
  resolved: "from-[var(--state-contradiction-resolved)]/35 via-[var(--state-contradiction-resolved)]/20 to-[var(--state-contradiction-resolved)]/35",
  faded: "from-[var(--state-weakened)]/25 via-[var(--state-weakened)]/15 to-[var(--state-weakened)]/25",
};

const STATUS_LABELS: Record<ContradictionStatus, string> = {
  active: "Active tension",
  softened: "Softened",
  resolved: "Resolved",
  faded: "Faded",
};

export function TensionBridge({ intensity, status, className = "" }: TensionBridgeProps) {
  const clampedIntensity = Math.min(100, Math.max(0, intensity));
  const barHeight = Math.max(12, Math.round((clampedIntensity / 100) * 48));

  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 px-2 py-4 sm:min-w-[5.5rem]",
        status === "resolved" || status === "faded" ? "opacity-80" : "",
        className,
      ].join(" ")}
      aria-label={`Tension intensity ${clampedIntensity}, status ${status}`}
    >
      <div
        className="w-[3px] rounded-full bg-[var(--state-contradiction-detected)]"
        style={{
          height: `${barHeight}px`,
          opacity: status === "resolved" ? 0.45 : clampedIntensity / 100,
          backgroundColor:
            status === "resolved" || status === "softened"
              ? "var(--state-contradiction-resolved)"
              : status === "faded"
                ? "var(--state-weakened)"
                : "var(--state-contradiction-detected)",
        }}
      />

      <div
        className={[
          "h-px w-full max-w-[4.5rem] bg-gradient-to-r sm:max-w-[5rem]",
          STATUS_BRIDGE_CLASS[status],
        ].join(" ")}
        aria-hidden="true"
      />

      <span className="text-lg text-[var(--state-contradiction-detected)]" aria-hidden="true">
        ↔
      </span>

      <p className="text-center text-label text-ink-tertiary">{STATUS_LABELS[status]}</p>
      <p className="text-center text-body-small text-ink-secondary">
        Intensity {clampedIntensity}
      </p>
    </div>
  );
}
