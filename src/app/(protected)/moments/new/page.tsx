import Link from "next/link";

import { SituationEntryFlow } from "@/components/home/situation-entry-flow";
import { AppShell } from "@/components/overview/app-shell";

type NewSituationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Repeated params arrive as arrays; a prefill only ever wants one value.
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewSituationPage({
  searchParams,
}: NewSituationPageProps) {
  // Emerging Situations links here with the suggested title/description —
  // prefills only, editable like anything the user typed themselves.
  const resolvedSearchParams = await searchParams;
  const initialTitle = firstParam(resolvedSearchParams.title);
  const initialContext = firstParam(resolvedSearchParams.context);

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
          className="text-[13px] font-medium text-[#707070] transition-colors duration-150 hover:text-[#b45309]"
        >
          ← Overview
        </Link>
      </div>

      <div className="pb-14">
        <SituationEntryFlow initialTitle={initialTitle} initialContext={initialContext} />
      </div>
    </AppShell>
  );
}
