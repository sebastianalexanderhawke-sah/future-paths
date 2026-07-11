import Link from "next/link";

import { SituationEntryFlow } from "@/components/home/situation-entry-flow";
import { AppShell } from "@/components/overview/app-shell";

export default function NewSituationPage() {
  return (
    <AppShell activeHref="/moments">
      {/* The flow owns its surfaces stage by stage — one card for the
          writing stages, destination cards for paths, the forecast shell for
          the forecast — so no stage ever nests a card inside another card.
          The frame stays quiet: a back link, then the flow at the shell's
          full editorial width. */}
      <div className="mb-8">
        <Link
          href="/overview"
          className="text-[13px] font-medium text-[#999999] transition-colors duration-150 hover:text-[#b45309]"
        >
          ← Overview
        </Link>
      </div>

      <div className="pb-14">
        <SituationEntryFlow />
      </div>
    </AppShell>
  );
}
