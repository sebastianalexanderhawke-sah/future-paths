type MomentumRingProps = {
  momentum: number;
  faded?: boolean;
  label: string;
  className?: string;
  id?: string;
};

const RADIUS = 44;
const STROKE = 3;
const SIZE = (RADIUS + STROKE) * 2;
const CENTER = RADIUS + STROKE;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_FRACTION = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;
const GAP_OFFSET = CIRCUMFERENCE * 0.125;

export function MomentumRing({
  momentum,
  faded = false,
  label,
  className = "",
  id = "momentum-ring-gradient",
}: MomentumRingProps) {
  const clampedMomentum = Math.min(100, Math.max(0, momentum));
  const filledLength = ARC_LENGTH * (clampedMomentum / 100);
  const trackDasharray = `${ARC_LENGTH} ${CIRCUMFERENCE - ARC_LENGTH}`;

  return (
    <div className={["relative inline-flex items-center justify-center", className].join(" ")}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${label}, momentum ${clampedMomentum} of 100`}
        className="-rotate-[210deg]"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={trackDasharray}
          strokeDashoffset={GAP_OFFSET}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={
            faded
              ? "var(--state-momentum-decreasing-start)"
              : `url(#${id})`
          }
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${CIRCUMFERENCE - filledLength}`}
          strokeDashoffset={GAP_OFFSET}
        />
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--state-momentum-increasing-start)" />
            <stop offset="100%" stopColor="var(--state-momentum-increasing-end)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute max-w-[5.5rem] text-center text-label text-ink-secondary">
        {label}
      </span>
    </div>
  );
}
