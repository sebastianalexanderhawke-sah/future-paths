import Link from "next/link";

import { SituationEntryFlow } from "@/components/home/situation-entry-flow";
import { SituationFlowHero } from "@/components/home/situation-flow-hero";
import { OverviewPageShell } from "@/components/overview/overview-page-shell";

function CreateSituationHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4 shadow-[var(--shadow-elevated)]">
      <div>
        <Link
          href="/overview"
          className="text-body-small text-ink-secondary underline-offset-4 hover:text-ink-primary hover:underline"
        >
          ← Back to home
        </Link>
        <h1 className="mt-2 text-h2 text-ink-primary">Create Situation</h1>
      </div>
    </header>
  );
}

export default function CreateSituationPage() {
  return (
    <OverviewPageShell header={<CreateSituationHeader />}>
      <SituationFlowHero />
      <SituationEntryFlow />
    </OverviewPageShell>
  );
}
