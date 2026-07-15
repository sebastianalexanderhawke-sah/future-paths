import type { CurrentFutureRendering, SimplifiedFutureRendering } from "@/lib/forecast-simplification-experiment";
import type { FutureMovement } from "@/lib/forecast-diff";
import { toFirstSentence } from "@/components/home/output-refinement";
import { CardShell } from "@/components/ui/card-shell";
import type { CardShellVariant } from "@/lib/design/tokens";

const MOVEMENT_INDICATOR: Record<FutureMovement, { symbol: string; className: string }> = {
  up: { symbol: "↑", className: "text-emerald-600" },
  down: { symbol: "↓", className: "text-rose-500" },
  neutral: { symbol: "−", className: "text-zinc-300" },
  new: { symbol: "↑", className: "text-emerald-600" },
};

const TIMEFRAME_LABELS: Record<string, string> = {
  days: "Likely within days",
  weeks: "Likely within weeks",
  months: "Likely within months",
  longer_term: "Longer-term",
};

type SimplifiedForecastFutureCardProps = {
  future: SimplifiedFutureRendering;
  label?: string;
};

export function SimplifiedForecastFutureCard({
  future,
  label = "Version A (Raw Claude)",
}: SimplifiedForecastFutureCardProps) {
  return (
    <CardShell variant="elevated" className="p-4 sm:p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-700">{label}</p>
      <h4 className="mt-3 text-h2 text-ink-primary">{future.title}</h4>

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <p className="text-label text-ink-tertiary">Why it might happen</p>
          <p className="mt-1 text-body-small text-ink-secondary">{future.whyItMightHappen}</p>
        </div>

        <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
          <p className="text-label text-ink-tertiary">Future impact</p>
          <p className="mt-1 text-body-small text-ink-primary">{future.futureImpact}</p>
        </div>
      </div>
    </CardShell>
  );
}

type CurrentForecastFutureCardProps = {
  future: CurrentFutureRendering;
  label?: string;
  movement?: FutureMovement;
  cardVariant?: CardShellVariant;
};

// Splits a v3 newline-encoded bullet field. Pre-v3 rows hold a single
// paragraph, which renders as a one-item list through the same path.
// Phase 3 caps every card section at two bullets to keep cards short —
// rows stored before the cap simply show their first two.
const MAX_SECTION_BULLETS = 2;

function splitForecastBullets(text: string | undefined | null): string[] {
  return (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_SECTION_BULLETS);
}

function ForecastBulletSection({ label, items }: { label?: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      {label ? <p className="text-label text-ink-tertiary">{label}</p> : null}
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-body-small text-ink-secondary">
            <span
              aria-hidden="true"
              className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--ink-tertiary)]/60"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Forecasts v3 Phase 3.1 card: title + time-horizon chip plus two
// two-bullet sections — What could happen / What you can do — always
// expanded and deliberately short. The model's why_this grounding is
// stored (whyItMightHappen) but no longer rendered; "What you can do" is
// the visually primary block (tinted, emphasized) because the action is
// the takeaway.
// Selected whenever a future carries action bullets; pre-v3 rows keep the
// legacy accordion below. The risk/opportunity distinction is carried by
// the group headers around the cards, not a per-card chip.
function StructuredForecastCard({
  future,
  label,
  movement,
  cardVariant = "elevated",
}: CurrentForecastFutureCardProps) {
  const timeframeLabel = future.timeframe ? TIMEFRAME_LABELS[future.timeframe] : undefined;
  const indicator = movement ? MOVEMENT_INDICATOR[movement] : null;

  return (
    <CardShell variant={cardVariant} className="overflow-hidden">
      {label ? (
        <p className="border-b border-[var(--ink-tertiary)]/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-amber-700 sm:px-5">
          {label}
        </p>
      ) : null}

      {/* A touch more air than the original px-4 py-3.5 — the cards are the
          forecast's hero elements, and the tighter padding read as a dense
          utility row rather than a considered card. */}
      <div className="flex flex-col gap-3.5 px-5 py-4 sm:px-6 sm:py-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <h4 className="text-h2 text-ink-primary">{future.title}</h4>
            {indicator ? (
              <span
                aria-label={movement}
                className={`shrink-0 font-mono text-[10px] font-semibold leading-none ${indicator.className}`}
              >
                {indicator.symbol}
              </span>
            ) : null}
          </div>
          {timeframeLabel ? (
            <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-label text-ink-secondary">
              {timeframeLabel}
            </span>
          ) : null}
        </div>

        {/* The card IS the "what could happen" — its title announces the
            prediction and the group header above frames it, so the bullets
            read directly under the title. Repeating an identical label on
            every card said nothing the layout doesn't already say; the one
            labelled block on a card is "What you can do", the takeaway. */}
        <ForecastBulletSection items={splitForecastBullets(future.futureImpact)} />

        {future.actions && future.actions.length > 0 ? (
          <div className="rounded-[var(--radius-whisper)] border border-[var(--state-emerging)]/20 bg-[var(--state-emerging)]/8 px-3.5 py-3">
            <p className="text-label font-semibold text-[var(--state-emerging)]">
              What you can do
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {future.actions.slice(0, MAX_SECTION_BULLETS).map((action) => (
                <li key={action} className="flex gap-2 text-body-small font-medium text-ink-primary">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--state-emerging)]/70"
                  />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </CardShell>
  );
}

export function CurrentForecastFutureCard({
  future,
  label,
  movement,
  cardVariant = "elevated",
}: CurrentForecastFutureCardProps) {
  // Forecasts v3 rows carry action bullets and render as the structured
  // always-open card; stored pre-v3 rows keep the legacy accordion.
  if (future.actions && future.actions.length > 0) {
    return (
      <StructuredForecastCard
        future={future}
        label={label}
        movement={movement}
        cardVariant={cardVariant}
      />
    );
  }

  const timeframeLabel = future.timeframe ? TIMEFRAME_LABELS[future.timeframe] : undefined;
  const indicator = movement ? MOVEMENT_INDICATOR[movement] : null;
  const preview = toFirstSentence(future.whyItMightHappen ?? "", 140);

  return (
    <CardShell variant={cardVariant} className="overflow-hidden">
      {label ? (
        <p className="border-b border-[var(--ink-tertiary)]/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-amber-700 sm:px-5">
          {label}
        </p>
      ) : null}

      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 transition-colors duration-150 hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/70 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-col gap-2">
            {timeframeLabel ? (
              <span className="self-start rounded-full bg-[var(--state-emerging)]/15 px-2.5 py-0.5 text-label font-semibold text-[var(--state-emerging)]">
                {timeframeLabel}
              </span>
            ) : null}
            <div className="flex items-baseline gap-1.5">
              <h4 className="text-h2 text-ink-primary">{future.title}</h4>
              {indicator ? (
                <span
                  aria-label={movement}
                  className={`shrink-0 font-mono text-[10px] font-semibold leading-none ${indicator.className}`}
                >
                  {indicator.symbol}
                </span>
              ) : null}
            </div>
            {preview ? (
              <p className="text-body-small text-ink-tertiary group-open:hidden">
                {preview}
              </p>
            ) : null}
          </div>
          {/* The platform's one disclosure mark — a turning chevron, not
              +/− text glyphs. */}
          <span aria-hidden="true" className="mt-1 shrink-0 text-ink-tertiary">
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none"
            >
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </summary>

        <div className="reveal-in flex flex-col gap-3 border-t border-[var(--ink-tertiary)]/10 px-4 pb-4 pt-3 sm:px-5">
          {future.signals.length > 0 ? (
            <div>
              <p className="text-label text-ink-tertiary">How You&apos;ll Know</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {future.signals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-label text-ink-secondary"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[var(--radius-whisper)] bg-[var(--surface-muted)] px-3 py-2.5">
            <p className="text-label text-ink-tertiary">Future impact</p>
            <p className="mt-1 text-body-small text-ink-primary">{future.futureImpact}</p>
          </div>

          <div>
            <p className="text-label text-ink-tertiary">Why this might happen</p>
            <p className="mt-1 text-body-small text-ink-secondary">{future.whyItMightHappen}</p>
          </div>

          {future.expansion ? (
            <details className="text-body-small text-ink-secondary">
              <summary className="cursor-pointer rounded-md text-ink-tertiary transition-colors duration-150 hover:text-ink-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2">
                View full reasoning
              </summary>
              <p className="reveal-in mt-2 border-t border-[var(--ink-tertiary)]/10 pt-2">
                {future.expansion}
              </p>
            </details>
          ) : null}
        </div>
      </details>
    </CardShell>
  );
}
