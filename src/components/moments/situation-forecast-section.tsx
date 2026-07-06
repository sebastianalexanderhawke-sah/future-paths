"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CheckInCard } from "@/components/check-ins/check-in-card";
import { CheckInForm } from "@/components/check-ins/check-in-form";
import { OverviewCard } from "@/components/overview/overview-card";
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

  // In Phase 4, the most recent check-in is shown prominently below the form.
  // Here we only show history (everything after the first), oldest first so
  // it reads chronologically.
  const historyCheckIns = [
    ...(checkInFirst ? checkIns.slice(1) : checkIns),
  ].reverse();

  const mostRecentCheckIn = checkInFirst ? (checkIns[0] ?? null) : null;

  const checkInSection = hasChosenPath && showCheckIn ? (
    <section id="check-in" className="scroll-mt-6">
      <OverviewCard className="px-9 py-7">
        <h2 className="text-[17px] font-bold text-[#111]">Check-in</h2>
        <p className="mt-[3px] text-[13px] text-[#888888]">
          Record what actually happened since your last forecast.
        </p>

        <div className="mt-5">
          <CheckInForm momentId={momentId} onBeforeSubmit={handleBeforeSubmit} />
        </div>

        {/* Pending reflection question — inline, directly after the form */}
        {pendingReflection?.reflection_question ? (
          <div className="mt-7 rounded-xl bg-[#f8f7ff] px-5 py-4">
            <p className="text-[12px] font-semibold text-[#6366f1]">
              A question worth sitting with
            </p>
            <p className="mt-2 text-[14px] leading-[1.7] text-[#111]">
              {pendingReflection.reflection_question}
            </p>
            <p className="mt-1 text-[12px] text-[#999999]">
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

        {mostRecentCheckIn ? (
          <div className="mt-7">
            <p className="text-[12px] font-semibold text-[#999999]">
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

        {historyCheckIns.length > 0 ? (
          <div className="mt-8 flex flex-col gap-3">
            <p className="text-[12px] font-semibold text-[#999999]">
              Earlier check-ins
            </p>
            {historyCheckIns.map((checkIn) => (
              <CheckInCard
                key={checkIn.id}
                checkIn={checkIn}
                identityUpdateSummary={checkInIdentitySummaries?.[checkIn.id] ?? null}
              />
            ))}
          </div>
        ) : null}
      </OverviewCard>
    </section>
  ) : null;

  const forecastSection = sections ? (
    <OverviewCard className="px-9 py-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-bold text-[#111]">
            Possible Futures
          </h2>
          <p className="mt-[3px] text-[13px] text-[#888888]">
            How this situation could unfold.
          </p>
          {checkInFirst && isRegenerated && generatedAt ? (
            <p className="mt-1 text-[12px] text-[#bbbbbb]">
              Updated after your check-in on{" "}
              {new Date(generatedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
        {transitioning ? (
          <button
            type="button"
            onClick={dismissTransition}
            className="shrink-0 cursor-pointer rounded-full bg-[#f4f4f6] px-3 py-1 text-[12px] font-medium text-[#666666] transition-colors duration-150 hover:bg-[#ececf0]"
          >
            Done
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {transitioning && disappearedFutures.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-semibold text-[#999999]">
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
            <summary className="cursor-pointer list-none py-1 text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1] [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">
                ▼ See all futures ({remainingFutures.length} more)
              </span>
              <span className="hidden group-open:inline">▲ Hide</span>
            </summary>
            <div className="mt-3 flex flex-col gap-4">
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
    </OverviewCard>
  ) : null;

  return (
    <>
      {forecastSection}
      {checkInSection}
    </>
  );
}
