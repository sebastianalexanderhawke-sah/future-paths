import { AlternateSelvesSection } from "@/components/overview/alternate-selves-section";
import { ContradictionsSection } from "@/components/overview/contradictions-section";
import { CurrentSelfSection } from "@/components/overview/current-self-section";
import { FutureSelvesSection } from "@/components/overview/future-selves-section";
import { IdentityUpdatesSection } from "@/components/overview/identity-updates-section";
import { MomentsSection } from "@/components/overview/moments-section";
import { OpenLoopsSection } from "@/components/overview/open-loops-section";
import { OverviewHeader } from "@/components/overview/overview-header";
import { OverviewHero } from "@/components/overview/overview-hero";
import { OverviewPageShell } from "@/components/overview/overview-page-shell";
import { TimelineSection } from "@/components/overview/timeline-section";
import { getCurrentSelf } from "@/lib/current-self";
import { listActiveContradictions } from "@/lib/contradictions";
import { listActiveFutureSelves } from "@/lib/future-selves";
import { listMomentsNeedingCheckIn } from "@/lib/homepage";
import { listIdentityUpdates } from "@/lib/identity-updates";
import { listPendingIdentityPrompts } from "@/lib/identity-prompts";
import { listLifeChapters } from "@/lib/life-chapters";
import { listMoments } from "@/lib/moments";
import { listPastCrossroads } from "@/lib/past-crossroads";
import type { CurrentSelf, IdentityPrompt, Moment } from "@/types/database";

type HeroCta = {
  href: string;
  label: string;
};

function getHeroCtas(
  currentSelf: CurrentSelf | null,
  momentsNeedingCheckIn: { moment: Moment; hasCheckIns: boolean }[],
  pendingPrompts: IdentityPrompt[],
): { primary: HeroCta; secondary: HeroCta } {
  if (momentsNeedingCheckIn.length > 0) {
    const { moment, hasCheckIns } = momentsNeedingCheckIn[0];

    return {
      primary: {
        href: `/moments/${moment.id}`,
        label: hasCheckIns ? "Add check-in" : "Complete check-in",
      },
      secondary: { href: "/moments/new", label: "New moment" },
    };
  }

  if (pendingPrompts.length > 0) {
    return {
      primary: {
        href: `/identity-prompts/${pendingPrompts[0].id}`,
        label: "Answer prompt",
      },
      secondary: {
        href: "/current-self",
        label: currentSelf ? "View current self" : "Generate current self",
      },
    };
  }

  if (currentSelf) {
    return {
      primary: { href: "/current-self", label: "View current self" },
      secondary: { href: "/moments/new", label: "New moment" },
    };
  }

  return {
    primary: { href: "/current-self", label: "Generate current self" },
    secondary: { href: "/moments/new", label: "Capture a moment" },
  };
}

export default async function OverviewPage() {
  const [
    momentsResult,
    updatesResult,
    chaptersResult,
    checkInResult,
    futuresResult,
    currentSelfResult,
    promptsResult,
    contradictionsResult,
    alternateSelvesResult,
  ] = await Promise.all([
    listMoments(),
    listIdentityUpdates(5),
    listLifeChapters(3),
    listMomentsNeedingCheckIn(),
    listActiveFutureSelves(3),
    getCurrentSelf(),
    listPendingIdentityPrompts(3),
    listActiveContradictions(3),
    listPastCrossroads(3),
  ]);

  const activeMoments =
    "moments" in momentsResult ? momentsResult.moments.slice(0, 5) : [];
  const identityUpdates =
    "identityUpdates" in updatesResult ? updatesResult.identityUpdates : [];
  const lifeChapters = "chapters" in chaptersResult ? chaptersResult.chapters : [];
  const momentsNeedingCheckIn =
    "moments" in checkInResult ? checkInResult.moments : [];
  const futureSelves =
    "futureSelves" in futuresResult ? futuresResult.futureSelves : [];
  const currentSelf =
    "currentSelf" in currentSelfResult ? currentSelfResult.currentSelf : null;
  const pendingPrompts = "prompts" in promptsResult ? promptsResult.prompts : [];
  const activeContradictions =
    "contradictions" in contradictionsResult ? contradictionsResult.contradictions : [];
  const alternateSelves =
    "crossroads" in alternateSelvesResult ? alternateSelvesResult.crossroads : [];

  const heroCtas = getHeroCtas(currentSelf, momentsNeedingCheckIn, pendingPrompts);

  return (
    <OverviewPageShell header={<OverviewHeader />}>
      <div className="flex flex-col gap-[var(--space-zone)] lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="lg:col-span-7">
          <OverviewHero
            currentSelf={currentSelf}
            primaryCta={heroCtas.primary}
            secondaryCta={heroCtas.secondary}
          />
        </div>
        <div className="lg:col-span-5">
          <OpenLoopsSection
            momentsNeedingCheckIn={momentsNeedingCheckIn}
            pendingPrompts={pendingPrompts}
          />
        </div>
      </div>

      <CurrentSelfSection currentSelf={currentSelf} />
      <IdentityUpdatesSection identityUpdates={identityUpdates} />
      <ContradictionsSection activeContradictions={activeContradictions} />
      <FutureSelvesSection futureSelves={futureSelves} />
      <TimelineSection lifeChapters={lifeChapters} />
      <MomentsSection activeMoments={activeMoments} />
      <AlternateSelvesSection alternateSelves={alternateSelves} />
    </OverviewPageShell>
  );
}
