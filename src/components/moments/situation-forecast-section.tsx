"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CheckInCard } from "@/components/check-ins/check-in-card";
import { CheckInForm } from "@/components/check-ins/check-in-form";
import { ReflectionAnswerForm } from "@/components/reflections/reflection-answer-form";
import { CurrentForecastFutureCard } from "@/components/home/forecast-simplification-cards";
import type { ForecastSections } from "@/components/home/forecast-utils";
import type { ScannableFuture } from "@/components/home/output-refinement";
import { CardShell } from "@/components/ui/card-shell";
import { computeForecastDiff, flattenFutures, normalizeTitle } from "@/lib/forecast-diff";
import type { FutureMovement } from "@/lib/forecast-diff";
import { toCurrentFutureRendering } from "@/lib/forecast-simplification-experiment";
import type { CheckIn } from "@/types/database";

const STORAGE_KEY = "forecast-before-checkin";
const TRANSITION_MS = 3000;
const SNAPSHOT_MAX_AGE_MS = 60_000;
const TOP_FUTURES_COUNT = 3;

type SnapshotPayload = {
  sections: ForecastSections;
  timestamp: number;
};

// Render-time safety net: generation already dedupes futures within and
// across categories, but stored forecasts saved before that fix (or any
// future code path that builds sections another way) could still contain a
// repeated title. Since `key={future.title}` requires uniqueness, dedupe by
// normalized title right before building the rendered list.
function dedupeByNormalizedTitle(futures: ScannableFuture[]): ScannableFuture[] {
  const seen = new Set<string>();
  return futures.filter((future) => {
    const key = normalizeTitle(future.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readAndClearSnapshot(): ForecastSections | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const payload = JSON.parse(raw) as SnapshotPayload;
    if (Date.now() - payload.timestamp > SNAPSHOT_MAX_AGE_MS) return null;
    return payload.sections;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function DisappearedFutureCard({ future }: { future: ScannableFuture }) {
  return (
    <div className="opacity-40">
      <CardShell variant="elevated" className="overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <h4 className="flex-1 text-h2 text-ink-primary line-through">{future.title}</h4>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-label text-zinc-500">
            No longer likely
          </span>
        </div>
      </CardShell>
    </div>
  );
}

type SituationForecastSectionProps = {
  sections: ForecastSections | null;
  isRegenerated: boolean;
  generatedAt: string | null;
  momentId: string;
  hasChosenPath: boolean;
  checkIns: CheckIn[];
  checkInIdentitySummaries?: Record<string, string | null>;
  movementMap?: Record<string, FutureMovement>;
  /** When true, check-in form renders above the forecast (Phase 4). */
  checkInFirst?: boolean;
  /** The most recent check-in with an unanswered reflection question. */
  pendingReflection?: CheckIn | null;
  /**
   * When false, the check-in section is omitted entirely. Used to keep a
   * freshly-generated forecast from immediately asking for a check-in —
   * that should only appear once the user has returned to the situation.
   */
  showCheckIn?: boolean;
};

export function SituationForecastSection({
  sections,
  isRegenerated,
  generatedAt,
  momentId,
  hasChosenPath,
  checkIns,
  checkInIdentitySummaries,
  movementMap,
  checkInFirst = false,
  pendingReflection = null,
  showCheckIn = true,
}: SituationForecastSectionProps) {
  const [previousSections, setPreviousSections] = useState<ForecastSections | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const snapshot = readAndClearSnapshot();
    if (snapshot && sections) {
      setPreviousSections(snapshot);
      setTransitioning(true);
      timerRef.current = setTimeout(() => {
        setTransitioning(false);
        setPreviousSections(null);
      }, TRANSITION_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBeforeSubmit = useCallback(() => {
    if (!sections) return;
    const payload: SnapshotPayload = { sections, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [sections]);

  const dismissTransition = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTransitioning(false);
    setPreviousSections(null);
  }, []);

  const diff = useMemo(() => {
    if (!transitioning || !previousSections || !sections) return null;
    return computeForecastDiff(previousSections, sections);
  }, [transitioning, previousSections, sections]);

  const allFutures = sections
    ? dedupeByNormalizedTitle([...flattenFutures(sections), ...(sections.wildCardFutures ?? [])])
    : [];
  const topFutures = allFutures.slice(0, TOP_FUTURES_COUNT);
  const remainingFutures = allFutures.slice(TOP_FUTURES_COUNT);
  const wildCardTitles = useMemo(
    () => new Set((sections?.wildCardFutures ?? []).map((future) => future.title)),
    [sections],
  );

  const disappearedFutures = useMemo(() => {
    if (!transitioning || !diff || !previousSections) return [];
    const prev = flattenFutures(previousSections);
    return dedupeByNormalizedTitle(prev.filter((f) => diff.disappeared.has(normalizeTitle(f.title))));
  }, [transitioning, diff, previousSections]);

  // In Phase 4, the most recent check-in is shown prominently above the form.
  // Here we only show history (everything after the first).
  const historyCheckIns = checkInFirst ? checkIns.slice(1) : checkIns;

  const mostRecentCheckIn = checkInFirst ? (checkIns[0] ?? null) : null;

  const checkInSection = hasChosenPath && showCheckIn ? (
    <section id="check-in" className="rounded-xl border border-zinc-200 bg-white p-6">
      {checkInFirst ? (
        <>
          {mostRecentCheckIn ? (
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Most recent check-in
              </p>
              <div className="mt-3">
                <CheckInCard
                  checkIn={mostRecentCheckIn}
                  identityUpdateSummary={checkInIdentitySummaries?.[mostRecentCheckIn.id] ?? null}
                  variant="prominent"
                />
              </div>
            </div>
          ) : null}
          <h2 className="text-sm font-semibold text-zinc-900">What has actually happened?</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Describe what you&apos;ve lived since you last checked in.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-zinc-900">Check in</h2>
          <p className="mt-1 text-sm text-zinc-500">
            What actually happened? Reality carries more weight than prediction.
          </p>
        </>
      )}

      <div className="mt-5">
        <CheckInForm momentId={momentId} onBeforeSubmit={handleBeforeSubmit} />
      </div>

      {/* Pending reflection question — inline, directly after the form */}
      {pendingReflection?.reflection_question ? (
        <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            A question worth sitting with
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-900">
            {pendingReflection.reflection_question}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            This question is about how you operate, not just this situation.
          </p>
          <div className="mt-4">
            <ReflectionAnswerForm
              checkInId={pendingReflection.id}
              submitLabel="Answer this question"
            />
          </div>
        </div>
      ) : null}

      {historyCheckIns.length > 0 ? (
        <div className="mt-8 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500">Earlier check-ins</h3>
          {historyCheckIns.map((checkIn) => (
            <CheckInCard
              key={checkIn.id}
              checkIn={checkIn}
              identityUpdateSummary={checkInIdentitySummaries?.[checkIn.id] ?? null}
            />
          ))}
        </div>
      ) : null}
    </section>
  ) : null;

  const forecastSection = sections ? (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          {checkInFirst && isRegenerated ? (
            <>
              <h2 className="text-sm font-semibold text-zinc-900">How the picture has changed</h2>
              {generatedAt ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Updated after your check-in on{" "}
                  {new Date(generatedAt).toLocaleDateString()}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-zinc-900">What might unfold</h2>
              <p className="mt-1 text-xs text-zinc-500">
                A forecast based on your chosen path. This will update as you check in.
              </p>
            </>
          )}
        </div>
        {transitioning ? (
          <button
            type="button"
            onClick={dismissTransition}
            className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200"
          >
            Done
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {transitioning && disappearedFutures.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              No longer likely
            </p>
            {disappearedFutures.map((future) => (
              <DisappearedFutureCard key={future.title} future={future} />
            ))}
          </div>
        ) : null}

        {topFutures.map((future) => {
          const rendering = toCurrentFutureRendering(future);
          const isNew = transitioning && diff?.appeared.has(normalizeTitle(future.title));
          return (
            <div key={future.title} className="relative">
              {isNew ? (
                <span className="absolute -top-1.5 right-2 z-10 rounded-full bg-[var(--state-emerging)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--state-emerging)]">
                  New
                </span>
              ) : null}
              <CurrentForecastFutureCard
                future={rendering}
                movement={movementMap?.[future.title]}
                cardVariant={wildCardTitles.has(future.title) ? "wildcard" : undefined}
              />
            </div>
          );
        })}

        {remainingFutures.length > 0 ? (
          <details className="group">
            <summary className="cursor-pointer list-none rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">
                See all futures ({remainingFutures.length} more)
              </span>
              <span className="hidden group-open:inline">Hide</span>
            </summary>
            <div className="mt-2 flex flex-col gap-3">
              {remainingFutures.map((future) => {
                const rendering = toCurrentFutureRendering(future);
                const isNew = transitioning && diff?.appeared.has(normalizeTitle(future.title));
                return (
                  <div key={future.title} className="relative">
                    {isNew ? (
                      <span className="absolute -top-1.5 right-2 z-10 rounded-full bg-[var(--state-emerging)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--state-emerging)]">
                        New
                      </span>
                    ) : null}
                    <CurrentForecastFutureCard
                      future={rendering}
                      movement={movementMap?.[future.title]}
                      cardVariant={wildCardTitles.has(future.title) ? "wildcard" : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  ) : null;

  if (checkInFirst) {
    return (
      <>
        {checkInSection}
        {forecastSection}
      </>
    );
  }

  return (
    <>
      {forecastSection}
      {checkInSection}
    </>
  );
}
