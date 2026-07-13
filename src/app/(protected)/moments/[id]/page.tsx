import Link from "next/link";
import { notFound } from "next/navigation";

import { generatePathsAction, choosePathAction } from "@/actions/paths";
import {
  generateForecastForMomentAction,
  regenerateForecastForChosenPathAction,
} from "@/actions/future-forecast";
import { CheckInCard } from "@/components/check-ins/check-in-card";
import { IdentityUpdateCard } from "@/components/identity/identity-update-card";
import { AlternatePathsDisclosure } from "@/components/moments/alternate-paths-disclosure";
import { ChosenPathPanel } from "@/components/moments/chosen-path-panel";
import { SituationForecastSection } from "@/components/moments/situation-forecast-section";
import { SummaryDisclosure } from "@/components/moments/summary-disclosure";
import { OtherPathCard } from "@/components/moments/stored-path-card";
import { AppSidebar } from "@/components/overview/app-sidebar";
import { OverviewCard } from "@/components/overview/overview-card";
import { buildCheckInIdentitySummaryMap } from "@/lib/check-in-identity-summary";
import { listCheckInsForMoment } from "@/lib/check-ins";
import { JUST_CHOSEN_PATH_PARAM } from "@/lib/forecast-visit-flag";
import { getAllForecastsForMoment, parseForecastSections } from "@/lib/forecasts";
import { computeMovementMap } from "@/lib/forecast-diff";
import { listIdentityUpdatesForMoment } from "@/lib/identity-updates";
import { getMoment } from "@/lib/moments";
import { listPathsForMoment } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";
import { formatRelativeTime } from "@/lib/relative-time";
import { getUserIdentity } from "@/lib/user-identity";

type MomentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MomentPage({ params, searchParams }: MomentPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const queryError = resolvedSearchParams.error;
  // True only for the exact response that follows path selection — the
  // redirect/navigation that creates the forecast appends this query
  // parameter once (see withJustChosenPathFlag). Any other visit to this
  // URL omits it, so the check-in form is never hidden by a timer.
  const isFreshlyGenerated = resolvedSearchParams[JUST_CHOSEN_PATH_PARAM] === "1";

  const [
    userIdentity,
    reflectionSummaryResult,
    momentResult,
    pathsResult,
    checkInsResult,
    identityUpdatesResult,
    allForecasts,
  ] = await Promise.all([
    getUserIdentity(),
    getUnansweredReflectionSummary(),
    getMoment(id),
    listPathsForMoment(id),
    listCheckInsForMoment(id),
    listIdentityUpdatesForMoment(id),
    getAllForecastsForMoment(id),
  ]);

  if ("error" in momentResult) notFound();
  if ("error" in pathsResult) notFound();
  if ("error" in checkInsResult) notFound();
  if ("error" in identityUpdatesResult) notFound();

  const { moment } = momentResult;
  const situationUnderstanding = moment.current_understanding ?? moment.description;
  const { paths } = pathsResult;
  const { checkIns } = checkInsResult;
  const { identityUpdates } = identityUpdatesResult;
  const reflectionSummary =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult : null;

  const checkInIdentitySummaries = buildCheckInIdentitySummaryMap(checkIns, identityUpdates);
  const chosenPath = paths.find((p) => p.is_chosen);
  const unchosePaths = paths.filter((p) => !p.is_chosen);

  const currentForecast = allForecasts[allForecasts.length - 1] ?? null;
  const previousForecast = allForecasts[allForecasts.length - 2] ?? null;
  const isRegenerated = allForecasts.length > 1;

  const forecastSections = currentForecast ? parseForecastSections(currentForecast.sections_json) : null;
  const previousForecastSections = previousForecast ? parseForecastSections(previousForecast.sections_json) : null;
  const movementMap =
    forecastSections && previousForecastSections
      ? computeMovementMap(forecastSections, previousForecastSections)
      : undefined;

  // Phase detection
  const isArchived = moment.status === "archived";
  const hasPaths = paths.length > 0;
  const hasChosenPath = !!chosenPath;
  const hasCheckIns = checkIns.length > 0;

  // Phase 4: the most recent check-in that has an unanswered reflection question
  const pendingReflection =
    hasCheckIns
      ? (checkIns.find((ci) => ci.reflection_question && !ci.reflection_answer) ?? null)
      : null;

  // Object state, matching the Situations list exactly.
  const state = isArchived
    ? { label: "Resolved", color: "#888888", soft: "#f4f4f6" }
    : !hasChosenPath
      ? { label: "Exploring options", color: "#666666", soft: "#f4f4f6" }
      : !hasCheckIns
        ? { label: "Forecast", color: "#b45309", soft: "#eef2ff" }
        : { label: "Checking in", color: "#10b981", soft: "#ecfdf5" };

  const summaryCard = situationUnderstanding ? (
    <OverviewCard className="px-9 py-7">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[22px] font-bold tracking-[-0.3px] text-[#111]">
          Situation Summary
        </h2>
        <span
          className="mt-1 shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ background: state.soft, color: state.color }}
        >
          {state.label}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[#999999]">
        Started {new Date(moment.created_at).toLocaleDateString()} · Updated{" "}
        {formatRelativeTime(moment.updated_at)}
      </p>
      <SummaryDisclosure text={situationUnderstanding} />
    </OverviewCard>
  ) : null;

  const chosenPathCard = chosenPath ? (
    <OverviewCard className="px-9 py-8">
      <div className="mb-6">
        <h2 className="text-[17px] font-bold text-[#111]">Chosen Path</h2>
        <p className="mt-[3px] text-[13px] text-[#888888]">
          The direction you committed to
        </p>
      </div>
      <ChosenPathPanel path={chosenPath} />
      {/* Alternate paths are supporting information, never equal to the
          chosen path — collapsed by default behind the quiet inline
          disclosure so the lived story reads uninterrupted. */}
      {!isArchived && unchosePaths.length > 0 ? (
        <AlternatePathsDisclosure>
          {unchosePaths.map((path, i) => (
            <OtherPathCard key={path.id} path={path} index={i} />
          ))}
        </AlternatePathsDisclosure>
      ) : null}
    </OverviewCard>
  ) : null;

  // Deliberately quieter than the work cards above it — a final action,
  // not another form.
  const resolveCard = (
    <OverviewCard className="px-9 py-6">
      <h2 className="text-[15px] font-semibold text-[#111]">
        Resolve Situation
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[#999999]">
        Once resolved, this situation moves to your archive and timeline.
        Nothing is deleted.
      </p>
      <div className="mt-4 border-t border-[#f5f5f5] pt-4">
        <Link
          href={`/moments/${moment.id}/resolve`}
          className="inline-block rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
        >
          Resolve Situation
        </Link>
      </div>
    </OverviewCard>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f4f6] text-[#111]">
      <AppSidebar
        activeHref="/moments"
        unansweredReflections={reflectionSummary?.unansweredCount ?? 0}
        userLabel={userIdentity.displayName ?? "Your account"}
        userInitial={userIdentity.initial}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1120px] px-10 py-10">
          {/* Page header */}
          <div className="mb-10">
            <Link
              href="/moments"
              className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#b45309]"
            >
              ← All situations
            </Link>
            <h1 className="mb-1.5 mt-3 text-[32px] font-extrabold tracking-[-0.8px] text-[#111]">
              {moment.title}
            </h1>
            <p className="text-[15px] text-[#999999]">
              Everything currently known about this situation.
            </p>
          </div>

          {queryError ? (
            <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {queryError}
            </p>
          ) : null}

          <div className="flex flex-col gap-5 pb-14">
            {/* ════════════════════════════════════════════════════════════
                PHASE 5 — Resolved. A summary artifact. No actions.
            ════════════════════════════════════════════════════════════ */}
            {isArchived ? (
              <>
                {summaryCard}
                {chosenPathCard}

                {checkIns.length > 0 ? (
                  <OverviewCard className="px-9 py-7">
                    <div className="mb-5">
                      <h2 className="text-[17px] font-bold text-[#111]">
                        What you lived through
                      </h2>
                    </div>
                    <div className="flex flex-col gap-3">
                      {checkIns.map((ci) => (
                        <CheckInCard
                          key={ci.id}
                          checkIn={ci}
                          identityUpdateSummary={checkInIdentitySummaries?.[ci.id] ?? null}
                        />
                      ))}
                    </div>
                  </OverviewCard>
                ) : null}

                {identityUpdates.length > 0 ? (
                  <OverviewCard className="px-9 py-7">
                    <div className="mb-5">
                      <h2 className="text-[17px] font-bold text-[#111]">
                        What this situation surfaced in you
                      </h2>
                    </div>
                    <div className="flex flex-col gap-3">
                      {identityUpdates.map((update) => (
                        <IdentityUpdateCard key={update.id} update={update} />
                      ))}
                    </div>
                  </OverviewCard>
                ) : null}
              </>
            ) : null}

            {/* ════════════════════════════════════════════════════════════
                PHASE 1 — No paths yet. Both mode options (legacy moments).
            ════════════════════════════════════════════════════════════ */}
            {!isArchived && !hasPaths ? (
              <>
                {summaryCard}

                <OverviewCard className="px-9 py-7">
                  <div className="mb-5">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      What are you looking for?
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      Choose how you want to explore this situation.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-[#ececf0] p-5">
                      <p className="text-[14px] font-semibold text-[#111]">
                        Explore Decisions
                      </p>
                      <p className="mt-0.5 text-[13px] text-[#888888]">
                        I haven&apos;t decided yet. Help me think through my options.
                      </p>
                      <form action={generatePathsAction} className="mt-4">
                        <input type="hidden" name="momentId" value={moment.id} />
                        <button
                          type="submit"
                          className="cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                        >
                          Explore decisions
                        </button>
                      </form>
                    </div>

                    <div className="rounded-xl border border-[#ececf0] p-5">
                      <p className="text-[14px] font-semibold text-[#111]">
                        Forecast Futures
                      </p>
                      <p className="mt-0.5 text-[13px] text-[#888888]">
                        This is already happening. Help me understand what may come next.
                      </p>
                      <form action={generateForecastForMomentAction} className="mt-4">
                        <input type="hidden" name="momentId" value={moment.id} />
                        <button
                          type="submit"
                          className="cursor-pointer rounded-[10px] border border-[#ececf0] bg-white px-[18px] py-2.5 text-[13px] font-semibold text-[#333333] transition-colors duration-150 hover:bg-[#f5f5f5]"
                        >
                          Generate forecast
                        </button>
                      </form>
                    </div>
                  </div>
                </OverviewCard>
              </>
            ) : null}

            {/* ════════════════════════════════════════════════════════════
                PHASE 2 — Paths generated, none chosen. Comparison layout.
            ════════════════════════════════════════════════════════════ */}
            {!isArchived && hasPaths && !hasChosenPath ? (
              <>
                {summaryCard}

                <section>
                  <div className="mb-4">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Your options
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#999999]">
                      Choose one to move forward
                    </p>
                  </div>
                  <div className="flex flex-col gap-5">
                    {paths.map((path, i) => (
                      <div key={path.id} className="flex flex-col gap-3">
                        <OtherPathCard path={path} index={i} />
                        <form action={choosePathAction}>
                          <input type="hidden" name="momentId" value={moment.id} />
                          <input type="hidden" name="pathId" value={path.id} />
                          <button
                            type="submit"
                            className="w-full cursor-pointer rounded-[10px] border border-[#ececf0] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#333333] transition-colors duration-150 hover:border-[#111] hover:bg-[#111] hover:text-white"
                          >
                            Choose this path
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}

            {/* ════════════════════════════════════════════════════════════
                PHASE 3 — Path chosen, no check-ins yet.
                PHASE 4 — Path chosen, check-ins exist.
                Summary → Chosen Path → Possible Futures → Check-in → Resolve.
            ════════════════════════════════════════════════════════════ */}
            {!isArchived && hasChosenPath ? (
              <>
                {summaryCard}
                {chosenPathCard}

                {/* A chosen path whose forecast never finished generating
                    (the failure redirect is seen once, then lost) would
                    otherwise leave a silent hole where Possible Futures
                    belongs. Say what's missing and offer the retry. */}
                {!forecastSections ? (
                  <OverviewCard className="px-9 py-7">
                    <h2 className="text-[17px] font-bold text-[#111]">
                      Possible Futures
                    </h2>
                    <p className="mt-[3px] text-[13px] text-[#888888]">
                      How this situation could unfold.
                    </p>
                    <p className="mt-5 max-w-[52em] text-[13px] leading-relaxed text-[#999999]">
                      The forecast for your chosen path hasn&apos;t been
                      generated yet. Once it runs, Reflection maps the risks
                      worth watching and the opportunities that could open up
                      — and every check-in you record sharpens it.
                    </p>
                    <form action={regenerateForecastForChosenPathAction} className="mt-4">
                      <input type="hidden" name="momentId" value={moment.id} />
                      <button
                        type="submit"
                        className="cursor-pointer rounded-[10px] bg-[#111] px-[18px] py-2.5 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-[0.88]"
                      >
                        Generate your forecast
                      </button>
                    </form>
                  </OverviewCard>
                ) : null}

                <SituationForecastSection
                  sections={forecastSections}
                  isRegenerated={isRegenerated}
                  generatedAt={currentForecast?.generated_at ?? null}
                  momentId={moment.id}
                  hasChosenPath={true}
                  checkIns={hasCheckIns ? checkIns : []}
                  checkInIdentitySummaries={hasCheckIns ? checkInIdentitySummaries : {}}
                  movementMap={movementMap}
                  checkInFirst={hasCheckIns}
                  pendingReflection={hasCheckIns ? pendingReflection : null}
                  showCheckIn={hasCheckIns ? true : !isFreshlyGenerated}
                />

                {resolveCard}
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
