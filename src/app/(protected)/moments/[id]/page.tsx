import Link from "next/link";
import { notFound } from "next/navigation";

import { generatePathsAction } from "@/actions/paths";
import { archiveMomentAction } from "@/actions/moments";
import { ChosenPathCard, OtherPathCard } from "@/components/moments/stored-path-card";
import { SituationForecastSection } from "@/components/moments/situation-forecast-section";
import { listCheckInsForMoment } from "@/lib/check-ins";
import { buildCheckInIdentitySummaryMap } from "@/lib/check-in-identity-summary";
import { getAllForecastsForMoment, parseForecastSections } from "@/lib/forecasts";
import { computeMovementMap } from "@/lib/forecast-diff";
import { listIdentityUpdatesForMoment } from "@/lib/identity-updates";
import { getMoment } from "@/lib/moments";
import { listPathsForMoment } from "@/lib/paths";

type MomentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function MomentPage({ params, searchParams }: MomentPageProps) {
  const { id } = await params;
  const { error: queryError } = await searchParams;

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
  const { paths } = pathsResult;
  const { checkIns } = checkInsResult;
  const { identityUpdates } = identityUpdatesResult;
  const checkInIdentitySummaries = buildCheckInIdentitySummaryMap(checkIns, identityUpdates);
  const chosenPath = paths.find((path) => path.is_chosen);
  const otherPaths = paths.filter((path) => !path.is_chosen);
  const canChoose = paths.length > 0 && !chosenPath;

  // Forecasts sorted ASC; latest is last
  const currentForecast = allForecasts[allForecasts.length - 1] ?? null;
  const previousForecast = allForecasts[allForecasts.length - 2] ?? null;
  const isRegenerated = allForecasts.length > 1;

  const forecastSections = currentForecast
    ? parseForecastSections(currentForecast.sections_json)
    : null;
  const previousForecastSections = previousForecast
    ? parseForecastSections(previousForecast.sections_json)
    : null;

  // Movement map: only meaningful when ≥2 forecast versions exist
  const movementMap =
    forecastSections && previousForecastSections
      ? computeMovementMap(forecastSections, previousForecastSections)
      : undefined;


  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/moments" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to situations
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">{moment.title}</h1>
        <p className="text-sm text-zinc-500">
          Created {new Date(moment.created_at).toLocaleDateString()}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
        {queryError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {queryError}
          </p>
        ) : null}

        {/* 1. Situation summary */}
        {moment.current_understanding ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-medium text-zinc-900">Situation summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {moment.current_understanding}
            </p>
          </section>
        ) : null}

        {/* 2. Decision paths */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Decision paths</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Possible directions to take. These are possibilities, not recommendations.
          </p>

          {paths.length === 0 ? (
            <form action={generatePathsAction} className="mt-4">
              <input type="hidden" name="momentId" value={moment.id} />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Generate paths
              </button>
            </form>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {/* Chosen path — fully expanded */}
              {chosenPath ? (
                <ChosenPathCard path={chosenPath} />
              ) : null}

              {/* Can still choose */}
              {canChoose ? (
                <div className="flex flex-col gap-3">
                  {paths.map((path, i) => (
                    <OtherPathCard key={path.id} path={path} index={i} />
                  ))}
                </div>
              ) : null}

              {/* Other paths — collapsed */}
              {chosenPath && otherPaths.length > 0 ? (
                <details className="group">
                  <summary className="cursor-pointer list-none text-sm text-zinc-500 hover:text-zinc-700 [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">
                      See other paths considered ({otherPaths.length})
                    </span>
                    <span className="hidden group-open:inline">Hide other paths</span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    {otherPaths.map((path, i) => (
                      <OtherPathCard key={path.id} path={path} index={i} />
                    ))}
                  </div>
                </details>
              ) : null}

              {chosenPath?.is_locked ? (
                <p className="text-xs text-zinc-400">
                  Your chosen path is locked after your first check-in.
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* 3. Future forecast + 4. Check-ins (client component for transition) */}
        <SituationForecastSection
          sections={forecastSections}
          isRegenerated={isRegenerated}
          generatedAt={currentForecast?.generated_at ?? null}
          momentId={moment.id}
          hasChosenPath={!!chosenPath}
          checkIns={checkIns}
          checkInIdentitySummaries={checkInIdentitySummaries}
          movementMap={movementMap}
        />

        {/* 5. Archive */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900">Archive</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Archiving removes this situation from your active list. Your identity
            history is preserved.
          </p>
          <form action={archiveMomentAction} className="mt-4">
            <input type="hidden" name="momentId" value={moment.id} />
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Archive situation
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
