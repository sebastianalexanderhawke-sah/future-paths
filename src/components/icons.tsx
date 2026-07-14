/**
 * The Overview's icon language: a small, hand-authored set of stroke icons
 * (24px grid, 1.8 stroke, round joins — Lucide-style) drawn with
 * `currentColor` so color always comes from the surrounding text color.
 * Two families live here:
 *
 *   - UI icons: one recognizable mark per Overview card and per attention
 *     category, so every card reads at a glance.
 *   - Identity icons: one mark per identity in the library, matched to the
 *     identity's personality. `FutureIcon` resolves an identity id to its
 *     mark (flag fallback for legacy/unknown identities), making icons —
 *     not just color — the primary identifier of a future.
 */

type IconProps = {
  size?: number;
  className?: string;
};

function Svg({
  size = 16,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// ── UI icons ────────────────────────────────────────────────────────────

/** Future Paths — branching routes. */
export function IconRoute(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <path d="M6 15.6V11a4 4 0 0 1 4-4h5.6" />
    </Svg>
  );
}

/** What's Changed — movement. */
export function IconTrendingUp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 16.8l6-6 4 4 7.5-7.5" />
      <path d="M14.8 7.3h5.7V13" />
    </Svg>
  );
}

/** Needs Attention — a quiet bell, not an alarm. */
export function IconBell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </Svg>
  );
}

/** Pattern Emerging + available reflections — insight. */
export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.2l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4-5.4-1.9 5.4-1.9z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

/** Overdue check-ins — time has passed. */
export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.2V12l3.2 1.9" />
    </Svg>
  );
}

/** Open decisions + the Explorer — orientation. */
export function IconCompass(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <path
        d="M15.2 8.8l-2 4.4-4.4 2 2-4.4z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

/** Timeline chapters — a page of the story. */
export function IconBookOpen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.5c-1.6-1.4-3.9-2-6.8-2v13c2.9 0 5.2.6 6.8 2 1.6-1.4 3.9-2 6.8-2v-13c-2.9 0-5.2.6-6.8 2z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

/** Sidebar — Overview. */
export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 10.5L12 4l7.5 6.5" />
      <path d="M6.5 8.8V20h11V8.8" />
    </Svg>
  );
}

/** Sidebar — Current Self. */
export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7.8" r="3.3" />
      <path d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
    </Svg>
  );
}

/** Sidebar — Situations. */
export function IconBriefcase(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="7.5" width="16" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M4 12.5h16" />
    </Svg>
  );
}

/** Sidebar — Workspace. */
export function IconPenLine(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 4a2.4 2.4 0 1 1 3.4 3.4L9.5 18.3 5 19.5l1.2-4.5L17 4z" />
      <path d="M3.5 21.5h9" />
    </Svg>
  );
}

/** Sidebar — Settings. */
export function IconGear(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3" />
      <path d="M12 18.5v3" />
      <path d="M2.5 12h3" />
      <path d="M18.5 12h3" />
      <path d="M5.3 5.3l2.1 2.1" />
      <path d="M16.6 16.6l2.1 2.1" />
      <path d="M18.7 5.3l-2.1 2.1" />
      <path d="M7.4 16.6l-2.1 2.1" />
    </Svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17L17 7" />
      <path d="M8.5 7H17v8.5" />
    </Svg>
  );
}

export function IconArrowDownRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7l10 10" />
      <path d="M17 8.5V17H8.5" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </Svg>
  );
}

// ── Identity icons ──────────────────────────────────────────────────────

/** The Builder — a person: builds a self, not just things. */
function IconPerson(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7.8" r="3.3" />
      <path d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
    </Svg>
  );
}

/** The Mentor — a flame passed on. */
function IconFlame(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.8c2.8 3 5.2 6 5.2 9.4a5.2 5.2 0 0 1-10.4 0c0-3.4 2.4-6.4 5.2-9.4z" />
      <path d="M12 12.5c1.2 1 1.8 2 1.8 3a1.8 1.8 0 0 1-3.6 0c0-1 .6-2 1.8-3z" />
    </Svg>
  );
}

/** The Craftsman — a ruler: measured, precise work. */
function IconRuler(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.8 16.2L16.2 3.8l4 4L7.8 20.2z" />
      <path d="M8.4 11.6l1.6 1.6" />
      <path d="M11.6 8.4l1.6 1.6" />
      <path d="M14.8 5.2l1.6 1.6" />
    </Svg>
  );
}

/** The Guardian — a shield. */
function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 3v5.2c0 4.6-2.9 7.4-7 8.8-4.1-1.4-7-4.2-7-8.8V6z" />
    </Svg>
  );
}

/** The Connector — people, together. */
function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.2 19.6a6 6 0 0 1 11.6 0" />
      <path d="M15.8 5.9a3.2 3.2 0 0 1 0 5.2" />
      <path d="M17.6 14.6a6 6 0 0 1 3 5" />
    </Svg>
  );
}

/** The Competitor — a trophy. */
function IconTrophy(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h10v6a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H4.5V7A3 3 0 0 0 7.4 10" />
      <path d="M17 5.5h2.5V7a3 3 0 0 1-2.9 4" />
      <path d="M12 15v3.5" />
      <path d="M8.5 20.5h7" />
    </Svg>
  );
}

/** The Reformer — renewal. */
function IconRefresh(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M21 3v5h-5" />
      <path d="M3 21v-5h5" />
    </Svg>
  );
}

/** The Scholar — a book. */
function IconBook(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </Svg>
  );
}

/** The Creator — a pen. */
function IconPen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Svg>
  );
}

/** Fallback for legacy/unknown identities — a destination flag. */
function IconFlag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 21V4" />
      <path d="M5 4.5c4-2 6 2 10 0V13c-4 2-6-2-10 0" />
    </Svg>
  );
}

const IDENTITY_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  "the-builder": IconPerson,
  "the-explorer": IconCompass,
  "the-mentor": IconFlame,
  "the-craftsman": IconRuler,
  "the-guardian": IconShield,
  "the-connector": IconUsers,
  "the-competitor": IconTrophy,
  "the-reformer": IconRefresh,
  "the-scholar": IconBook,
  "the-creator": IconPen,
};

type FutureIconProps = IconProps & {
  identityId: string | null | undefined;
};

/** The identity's personality mark; a destination flag when unknown. */
export function FutureIcon({ identityId, ...props }: FutureIconProps) {
  const Icon = (identityId && IDENTITY_ICONS[identityId]) || IconFlag;
  return <Icon {...props} />;
}
