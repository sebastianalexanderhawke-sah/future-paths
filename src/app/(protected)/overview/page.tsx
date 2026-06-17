import Link from "next/link";

import { CurrentSelfHomeSection } from "@/components/home/current-self-home-section";
import { FutureSelfHomeSection } from "@/components/home/future-self-home-section";
import { MomentCard } from "@/components/moments/moment-card";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewPageShell } from "@/components/overview/overview-page-shell";
import { OverviewSection } from "@/components/overview/overview-section";
import { ReflectionAnswerForm } from "@/components/reflections/reflection-answer-form";
import { getLastCheckInsForMoments } from "@/lib/check-ins";
import { getCurrentSelf } from "@/lib/current-self";
import { getForecastExistenceForMoments } from "@/lib/forecasts";
import { listActiveFutureSelves } from "@/lib/future-selves";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { listMoments } from "@/lib/moments";
import { getChosenPathsForMoments } from "@/lib/paths";
import { getUnansweredReflectionSummary } from "@/lib/reflections";

export default async function OverviewPage() {
  const [
    momentsResult,
    updatesResult,
    futuresResult,
    currentSelfResult,
    reflectionSummaryResult,
  ] = await Promise.all([
    listMoments(),
    listIdentityUpdates(4),
    listActiveFutureSelves(1),
    getCurrentSelf(),
    getUnansweredReflectionSummary(),
  ]);

  const situations = "moments" in momentsResult ? momentsResult.moments : [];
  const recentChanges =
    "identityUpdates" in updatesResult ? updatesResult.identityUpdates : [];
  const emphasizedFutureSelf =
    "futureSelves" in futuresResult && futuresResult.futureSelves.length > 0
      ? futuresResult.futureSelves[0]
      : null;
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;
  const unansweredCount =
    "unansweredCount" in reflectionSummaryResult
      ? reflectionSummaryResult.unansweredCount
      : 0;
  const pendingReflection =
    "pending" in reflectionSummaryResult ? reflectionSummaryResult.pending : null;

  const momentIds = situations.map((m) => m.id);
  const [chosenPaths, lastCheckIns, forecastMomentIds] = await Promise.all([
    getChosenPathsForMoments(momentIds),
    getLastCheckInsForMoments(momentIds),
    getForecastExistenceForMoments(momentIds),
  ]);

  const enrichments = Object.fromEntries(
    momentIds.map((id) => [
      id,
      {
        chosenPathTitle: chosenPaths[id],
        lastCheckIn: lastCheckIns[id] ? { created_at: lastCheckIns[id] } : undefined,
        hasForecast: forecastMomentIds.has(id),
      },
    ]),
  );

  const hasAnySituations = situations.length > 0;

  return (
    <OverviewPageShell header={<OverviewHeader />}>

      {/* ── ZONE 1: What you are moving through ──────────────────────────── */}
      {hasAnySituations ? (
        <OverviewSection
          label="Situations"
          title="What you're navigating"
          viewAllHref="/moments"
          viewAllLabel="All situations"
        >
          <div className="flex flex-col gap-3">
            {situations.slice(0, 5).map((moment) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                chosenPathTitle={enrichments[moment.id]?.chosenPathTitle}
                lastCheckIn={enrichments[moment.id]?.lastCheckIn}
                hasForecast={enrichments[moment.id]?.hasForecast ?? false}
              />
            ))}
          </div>
          <div className="pt-1">
            <Link
              href="/moments/new"
              className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              + New situation
            </Link>
          </div>
        </OverviewSection>
      ) : (
        /* Empty state — new user */
        <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-8 py-16 text-center">
          <h2 className="text-xl font-semibold text-zinc-900">
            What situation is weighing on you right now?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-zinc-500">
            Future Paths will help you think through your options and track what
            you&apos;re learning about yourself as you navigate it.
          </p>
          <Link
            href="/moments/new"
            className="mt-8 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Create your first situation
          </Link>
        </section>
      )}

      {/* ── ZONE 2: What is emerging ─────────────────────────────────────── */}
      {(unansweredCount > 0 && pendingReflection) || recentChanges.length > 0 ? (
        <section className="flex flex-col gap-4">
          <p className="text-label text-ink-tertiary">What&apos;s emerging</p>

          {/* Pending reflection — highest priority signal */}
          {unansweredCount > 0 && pendingReflection ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
                  {unansweredCount}
                </span>
                <p className="text-xs font-medium text-zinc-900">
                  A question worth sitting with
                </p>
              </div>
              <p className="mt-2 text-xs text-zinc-400">{pendingReflection.moment.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-900">
                {pendingReflection.reflection_question}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
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

          {/* Recent identity signals */}
          {recentChanges.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentChanges.map((update) => (
                <div
                  key={update.id}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <p className="text-xs font-medium text-zinc-500">{update.update_type.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">{update.title}</p>
                  {update.summary ? (
                    <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{update.summary}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── ZONE 3: Who you are becoming ─────────────────────────────────── */}
      <CurrentSelfHomeSection currentSelf={currentSelf} recentChanges={[]} />
      <FutureSelfHomeSection futureSelf={emphasizedFutureSelf} />

    </OverviewPageShell>
  );
}
