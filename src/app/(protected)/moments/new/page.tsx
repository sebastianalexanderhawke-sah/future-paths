import Link from "next/link";

import { SituationEntryFlow } from "@/components/home/situation-entry-flow";
import { AppShell } from "@/components/overview/app-shell";
import { OverviewCard } from "@/components/overview/overview-card";

export default function NewSituationPage() {
  return (
    <AppShell activeHref="/moments">
      {/* Page header — the flow supplies its own stage headings. */}
      <div className="mb-8">
        <Link
          href="/overview"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#6366f1]"
        >
          ← Overview
        </Link>
      </div>

      <div className="max-w-2xl pb-14">
        <OverviewCard className="px-9 py-9">
          <SituationEntryFlow />
        </OverviewCard>
      </div>
    </AppShell>
  );
}
