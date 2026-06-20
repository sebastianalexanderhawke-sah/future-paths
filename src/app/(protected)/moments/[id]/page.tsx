import Link from "next/link";
import { notFound } from "next/navigation";

import { generatePathsAction, choosePathAction } from "@/actions/paths";
import { generateForecastForMomentAction } from "@/actions/future-forecast";
import { CheckInCard } from "@/components/check-ins/check-in-card";
import { ChosenPathCard, OtherPathCard } from "@/components/moments/stored-path-card";
import { SituationForecastSection } from "@/components/moments/situation-forecast-section";
import { SituationSummaryCard } from "@/components/moments/situation-summary-card";
import { IdentityUpdateCard } from "@/components/identity/identity-update-card";
import { buildCheckInIdentitySummaryMap } from "@/lib/check-in-identity-summary";
import { listCheckInsForMoment } from "@/lib/check-ins";
import { JUST_CHOSEN_PATH_PARAM } from "@/lib/forecast-visit-flag";
import { getAllForecastsForMoment, parseForecastSections } from "@/lib/forecasts";
import { computeMovementMap } from "@/lib/forecast-diff";
import { listIdentityUpdatesForMoment } from "@/lib/identity-updates";
import { getMoment } from "@/lib/moments";
import { listPathsForMoment } from "@/lib/paths";

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

  const [momentResult, pathsResult, checkInsResult, identityUpdatesResult, allForecasts] =
    await Promise.all([
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

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/moments" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← All situations
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">{moment.title}</h1>
          {isArchived ? (
            <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
              Resolved
            </span>
          ) : null}
        </div>
        <p className="text-xs text-zinc-400">
          Started {new Date(moment.created_at).toLocaleDateString()}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
        {queryError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {queryError}
          </p>
        ) : null}

        {/* ════════════════════════════════════════════════════════════════════
            PHASE 5 — Resolved
            Shows a summary artifact. No actions.
        ════════════════════════════════════════════════════════════════════ */}
        {isArchived ? (
          <>
            {situationUnderstanding ? (
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  What Future Paths Understands
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  {situationUnderstanding}
                </p>
              </section>
            ) : null}

            {chosenPath ? (
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  The path you chose
                </p>
                <div className="mt-3">
                  <ChosenPathCard path={chosenPath} />
                </div>
              </section>
            ) : null}

            {checkIns.length > 0 ? (
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  What you lived through
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {checkIns.map((ci) => (
                    <CheckInCard
                      key={ci.id}
                      checkIn={ci}
                      identityUpdateSummary={checkInIdentitySummaries?.[ci.id] ?? null}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {identityUpdates.length > 0 ? (
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  What this situation surfaced in you
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {identityUpdates.map((update) => (
                    <IdentityUpdateCard key={update.id} update={update} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {/* ════════════════════════════════════════════════════════════════════
            PHASE 1 — No paths yet
            Shows both mode options. This state only occurs for legacy moments
            created before the entry flow existed.
        ════════════════════════════════════════════════════════════════════ */}
        {!isArchived && !hasPaths ? (
          <>
            {situationUnderstanding ? (
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  What Future Paths Understands
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  {situationUnderstanding}
                </p>
              </section>
            ) : null}

            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-900">What are you looking for?</h2>
              <p className="mt-1 text-sm text-zinc-500">Choose how you want to explore this situation.</p>

              <div className="mt-5 flex flex-col gap-3">
                {/* Decision Simulator */}
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-900">Explore Decisions</p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    I haven&apos;t decided yet. Help me think through my options.
                  </p>
                  <form action={generatePathsAction} className="mt-3">
                    <input type="hidden" name="momentId" value={moment.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                    >
                      Explore decisions
                    </button>
                  </form>
                </div>

                {/* Forecast Mode */}
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-900">Forecast Futures</p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    This is already happening. Help me understand what may come next.
                  </p>
                  <form action={generateForecastForMomentAction} className="mt-3">
                    <input type="hidden" name="momentId" value={moment.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                    >
                      Generate forecast
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {/* ════════════════════════════════════════════════════════════════════
            PHASE 2 — Paths generated, none chosen
            Comparison layout. Each path fully visible.
        ════════════════════════════════════════════════════════════════════ */}
        {!isArchived && hasPaths && !hasChosenPath ? (
          <>
            {situationUnderstanding ? (
              <details className="group rounded-xl border border-zinc-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm text-zinc-500 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-zinc-700 group-open:hidden line-clamp-1">
                    {situationUnderstanding}
                  </span>
                  <span className="hidden font-medium text-zinc-700 group-open:block">
                    What Future Paths Understands
                  </span>
                  <span aria-hidden="true" className="ml-3 shrink-0 text-zinc-400">
                    <span className="group-open:hidden">↓</span>
                    <span className="hidden group-open:inline">↑</span>
                  </span>
                </summary>
                <div className="border-t border-zinc-100 px-5 pb-4 pt-3">
                  <p className="text-sm leading-relaxed text-zinc-700">{situationUnderstanding}</p>
                </div>
              </details>
            ) : null}

            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 px-1">
                Your options — choose one to move forward
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {paths.map((path, i) => (
                <div key={path.id} className="flex flex-col gap-3">
                  <OtherPathCard path={path} index={i} />
                  <form action={choosePathAction}>
                    <input type="hidden" name="momentId" value={moment.id} />
                    <input type="hidden" name="pathId" value={path.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                    >
                      Choose this path
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {/* ════════════════════════════════════════════════════════════════════
            PHASE 3 — Path chosen, no check-ins yet
            Situation summary anchors the page, then chosen path, then
            forecast. The check-in form stays hidden while this is still the
            same visit that generated the forecast — see isFreshlyGenerated.
        ════════════════════════════════════════════════════════════════════ */}
        {!isArchived && hasChosenPath && !hasCheckIns ? (
          <>
            {situationUnderstanding ? (
              <SituationSummaryCard text={situationUnderstanding} />
            ) : null}

            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Your chosen path
              </p>
              <div className="mt-3">
                <ChosenPathCard path={chosenPath} />
              </div>
              {unchosePaths.length > 0 ? (
                <details className="group mt-4">
                  <summary className="cursor-pointer list-none text-sm text-zinc-400 hover:text-zinc-600 [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">
                      See other paths considered ({unchosePaths.length})
                    </span>
                    <span className="hidden group-open:inline">Hide other paths</span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    {unchosePaths.map((path, i) => (
                      <OtherPathCard key={path.id} path={path} index={i} />
                    ))}
                  </div>
                </details>
              ) : null}
            </section>

            <SituationForecastSection
              sections={forecastSections}
              isRegenerated={isRegenerated}
              generatedAt={currentForecast?.generated_at ?? null}
              momentId={moment.id}
              hasChosenPath={true}
              checkIns={[]}
              checkInIdentitySummaries={{}}
              movementMap={movementMap}
              checkInFirst={false}
              showCheckIn={!isFreshlyGenerated}
            />

            <div className="pt-2 text-center">
              <Link
                href={`/moments/${moment.id}/resolve`}
                className="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-600 hover:underline"
              >
                Resolve this situation
              </Link>
            </div>
          </>
        ) : null}

        {/* ════════════════════════════════════════════════════════════════════
            PHASE 4 — Path chosen, check-ins exist
            Chosen path first (the decision), then forecast (the prediction),
            then check-in form + most recent check-in (the reality).
        ════════════════════════════════════════════════════════════════════ */}
        {!isArchived && hasChosenPath && hasCheckIns ? (
          <>
            {situationUnderstanding ? (
              <SituationSummaryCard text={situationUnderstanding} />
            ) : null}

            {/* Chosen path — collapsed, accessible */}
            <details className="group rounded-xl border border-zinc-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm [&::-webkit-details-marker]:hidden">
                <span className="text-zinc-500">Your chosen path</span>
                <span aria-hidden="true" className="text-zinc-400">
                  <span className="group-open:hidden">↓</span>
                  <span className="hidden group-open:inline">↑</span>
                </span>
              </summary>
              <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
                <ChosenPathCard path={chosenPath} />
              </div>
            </details>

            {/* Evolved forecast + check-in form + pending reflection + most recent check-in + history */}
            <SituationForecastSection
              sections={forecastSections}
              isRegenerated={isRegenerated}
              generatedAt={currentForecast?.generated_at ?? null}
              momentId={moment.id}
              hasChosenPath={true}
              checkIns={checkIns}
              checkInIdentitySummaries={checkInIdentitySummaries}
              movementMap={movementMap}
              checkInFirst={true}
              pendingReflection={pendingReflection}
            />

            <div className="pt-2 text-center">
              <Link
                href={`/moments/${moment.id}/resolve`}
                className="text-sm text-zinc-400 underline-offset-4 hover:text-zinc-600 hover:underline"
              >
                Resolve this situation
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
