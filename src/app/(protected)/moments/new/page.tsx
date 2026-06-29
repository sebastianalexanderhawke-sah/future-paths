import Link from "next/link";

import { SituationEntryFlow } from "@/components/home/situation-entry-flow";

export default function NewSituationPage() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-zinc-100 px-6 py-4">
        <Link
          href="/overview"
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-600"
        >
          ← Home
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-col px-6 py-12">
        <SituationEntryFlow />
      </main>
    </div>
  );
}
