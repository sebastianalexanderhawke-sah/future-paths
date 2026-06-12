import { CurrentSelfHomeSection } from "@/components/home/current-self-home-section";
import { ExistingSituationsSection } from "@/components/home/existing-situations-section";
import { FutureSelfHomeSection } from "@/components/home/future-self-home-section";
import { SituationHero } from "@/components/home/situation-hero";
import { TimelineHomeSection } from "@/components/home/timeline-home-section";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewPageShell } from "@/components/overview/overview-page-shell";
import { getCurrentSelf } from "@/lib/current-self";
import { listActiveFutureSelves } from "@/lib/future-selves";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { listLifeChapters } from "@/lib/life-chapters";
import { listMoments } from "@/lib/moments";

export default async function OverviewPage() {
  const [momentsResult, updatesResult, chaptersResult, futuresResult, currentSelfResult] =
    await Promise.all([
      listMoments(),
      listIdentityUpdates(5),
      listLifeChapters(3),
      listActiveFutureSelves(1),
      getCurrentSelf(),
    ]);

  const recentSituations =
    "moments" in momentsResult ? momentsResult.moments.slice(0, 5) : [];
  const recentChanges =
    "identityUpdates" in updatesResult ? updatesResult.identityUpdates : [];
  const lifeChapters = "chapters" in chaptersResult ? chaptersResult.chapters : [];
  const emphasizedFutureSelf =
    "futureSelves" in futuresResult && futuresResult.futureSelves.length > 0
      ? futuresResult.futureSelves[0]
      : null;
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;

  return (
    <OverviewPageShell header={<OverviewHeader />}>
      <SituationHero />
      <CurrentSelfHomeSection currentSelf={currentSelf} recentChanges={recentChanges} />
      <FutureSelfHomeSection futureSelf={emphasizedFutureSelf} />
      <ExistingSituationsSection recentSituations={recentSituations} />
      <TimelineHomeSection lifeChapters={lifeChapters} />
    </OverviewPageShell>
  );
}
