import Link from "next/link";

import { signOut } from "@/actions/auth";
import { AlternateSelfCard } from "@/components/alternate-selves/alternate-self-card";
import { CheckInPromptCard } from "@/components/homepage/check-in-prompt-card";
import { ContradictionCard } from "@/components/contradictions/contradiction-card";
import { CurrentSelfCard } from "@/components/current-self/current-self-card";
import { FutureCard } from "@/components/futures/future-card";
import { IdentityPromptCard } from "@/components/identity-prompts/identity-prompt-card";
import { IdentityUpdateCard } from "@/components/identity/identity-update-card";
import { MomentCard } from "@/components/moments/moment-card";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import { getCurrentSelf } from "@/lib/current-self";
import { listAlternateSelves } from "@/lib/alternate-selves";
import { listActiveContradictions } from "@/lib/contradictions";
import { listActiveFutureSelves } from "@/lib/future-selves";
import { listMomentsNeedingCheckIn } from "@/lib/homepage";
import { listPendingIdentityPrompts } from "@/lib/identity-prompts";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { listMoments } from "@/lib/moments";
import { listRecentTimelineEvents } from "@/lib/timeline";

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-sm text-zinc-600">
      {children}
    </div>
  );
}

export default async function OverviewPage() {
  const [momentsResult, updatesResult, timelineResult, checkInResult, futuresResult, currentSelfResult, promptsResult, contradictionsResult, alternateSelvesResult] =
    await Promise.all([
      listMoments(),
      listIdentityUpdates(5),
      listRecentTimelineEvents(8),
      listMomentsNeedingCheckIn(),
      listActiveFutureSelves(3),
      getCurrentSelf(),
      listPendingIdentityPrompts(3),
      listActiveContradictions(3),
      listAlternateSelves(3),
    ]);

  const activeMoments =
    "moments" in momentsResult ? momentsResult.moments.slice(0, 5) : [];
  const identityUpdates =
    "identityUpdates" in updatesResult ? updatesResult.identityUpdates : [];
  const timelineEvents =
    "events" in timelineResult ? timelineResult.events : [];
  const momentsNeedingCheckIn =
    "moments" in checkInResult ? checkInResult.moments : [];
  const futureSelves =
    "futureSelves" in futuresResult ? futuresResult.futureSelves : [];
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;
  const pendingPrompts =
    "prompts" in promptsResult ? promptsResult.prompts : [];
  const activeContradictions =
    "contradictions" in contradictionsResult ? contradictionsResult.contradictions : [];
  const alternateSelves =
    "alternateSelves" in alternateSelvesResult ? alternateSelvesResult.alternateSelves : [];

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm text-zinc-500">Future Paths</p>
          <h1 className="text-lg font-semibold text-zinc-900">Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/moments/new"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            New moment
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-12">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">
                Who am I becoming?
              </h2>
              <p className="mt-1 text-sm text-zinc-500">Future Selves</p>
            </div>
            {futureSelves.length > 0 ? (
              <Link
                href="/future-selves"
                className="text-sm text-zinc-600 underline-offset-4 hover:underline"
              >
                View all
              </Link>
            ) : null}
          </div>

          {futureSelves.length === 0 ? (
            <EmptyState>
              Future Selves will appear here as patterns emerge across your
              moments and check-ins.{" "}
              <Link
                href="/future-selves"
                className="mt-4 inline-block text-zinc-900 underline-offset-4 hover:underline"
              >
                Discover futures
              </Link>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {futureSelves.map((futureSelf) => (
                <FutureCard key={futureSelf.id} futureSelf={futureSelf} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">
                Who could I have become?
              </h2>
              <p className="mt-1 text-sm text-zinc-500">Alternate selves</p>
            </div>
            <Link
              href="/alternate-selves"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>

          {alternateSelves.length === 0 ? (
            <EmptyState>
              Explore a significant past decision to see who you might have become
              along another path.{" "}
              <Link
                href="/alternate-selves/new"
                className="mt-4 inline-block text-zinc-900 underline-offset-4 hover:underline"
              >
                Explore past decision
              </Link>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {alternateSelves.map((alternateSelf) => (
                <AlternateSelfCard key={alternateSelf.id} alternateSelf={alternateSelf} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">Who am I today?</h2>
              <p className="mt-1 text-sm text-zinc-500">Current Self and contradictions</p>
            </div>
            {currentSelf ? (
              <Link
                href="/current-self"
                className="text-sm text-zinc-600 underline-offset-4 hover:underline"
              >
                View all
              </Link>
            ) : null}
          </div>

          {currentSelf ? (
            <CurrentSelfCard currentSelf={currentSelf} />
          ) : (
            <EmptyState>
              Your current identity summary will appear here once you have moments,
              check-ins, and active Future Selves.{" "}
              <Link
                href="/current-self"
                className="mt-4 inline-block text-zinc-900 underline-offset-4 hover:underline"
              >
                Generate current self
              </Link>
            </EmptyState>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-zinc-500">Contradictions</p>
            <Link
              href="/contradictions"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          </div>

          {activeContradictions.length === 0 ? (
            <EmptyState>
              Identity tensions will appear here after you detect contradictions from
              your current self, futures, and reflections.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {activeContradictions.map((contradiction) => (
                <ContradictionCard key={contradiction.id} contradiction={contradiction} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-900">
                What is shaping me?
              </h2>
              <p className="mt-1 text-sm text-zinc-500">Active moments</p>
            </div>
            <Link
              href="/moments"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>

          {activeMoments.length === 0 ? (
            <EmptyState>
              No active moments yet.{" "}
              <Link
                href="/moments/new"
                className="mt-4 inline-block text-zinc-900 underline-offset-4 hover:underline"
              >
                Capture your first moment
              </Link>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {activeMoments.map((moment) => (
                <MomentCard key={moment.id} moment={moment} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">What changed?</h2>
            <p className="mt-1 text-sm text-zinc-500">Identity updates</p>
          </div>

          {identityUpdates.length === 0 ? (
            <EmptyState>
              Meaningful shifts will appear here after check-ins reveal new
              patterns.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {identityUpdates.map((update) => (
                <IdentityUpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Recent history</h2>
            <p className="mt-1 text-sm text-zinc-500">Timeline events</p>
          </div>

          {timelineEvents.length === 0 ? (
            <EmptyState>
              Your identity history will build as you capture moments, explore
              paths, and check in.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {timelineEvents.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">
              What should I do next?
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Check-ins and identity prompts</p>
          </div>

          {momentsNeedingCheckIn.length === 0 ? (
            <EmptyState>
              Choose a path on an active moment to unlock check-ins, or capture
              a new moment to begin.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {momentsNeedingCheckIn.map(({ moment, hasCheckIns }) => (
                <CheckInPromptCard
                  key={moment.id}
                  moment={moment}
                  hasCheckIns={hasCheckIns}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-zinc-500">Identity prompts</p>
            <Link
              href="/identity-prompts"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          </div>

          {pendingPrompts.length === 0 ? (
            <EmptyState>
              Generate reflection questions from your current self, active futures,
              and recent shifts on the Identity Prompts page.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingPrompts.map((prompt) => (
                <IdentityPromptCard key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
